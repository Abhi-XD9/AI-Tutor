from rest_framework import status, viewsets, serializers
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    DocumentSerializer, MessageSerializer, ConversationSerializer,
    AssessmentAnswerSerializer, AssessmentAnswerReviewSerializer,
    AssessmentHistorySerializer, AssessmentSerializer,
    SubjectDocumentSerializer, TopicProposalSerializer,
)
from .models import (
    Assessment, AssessmentAnswer, TopicDocument, Conversation, Message,
    SubjectDocument, TopicProposal, TopicProposalItem, ContentChunk,
)
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from topics.models import Topic
from subjects.models import Subject
from django.shortcuts import get_object_or_404
from .services.knowledge_service import KnowledgeService
from .services.web_search_service import WebSearchService
from .agents.tutor_graph import TutorGraph
from langchain_core.messages import HumanMessage, AIMessage
from .assessment.evaluation_service import AssessmentEvaluationService
from .assessment.generation_service import AssessmentGenerationService
from .assessment.llm import AssessmentLLM
from .services.document_processor import DocumentProcessor
from .services.chunking_service import ChunkingService
from django.db import transaction
from django.utils import timezone
import json
import os
import re


def get_document_names(topic_id):
    documents = TopicDocument.objects.filter(topic__topic_id=topic_id)
    return [document.title for document in documents]


def _normalise_assessment_answer(question, value):
    if question.question_type == "multi_select":
        if not isinstance(value, list):
            raise ValueError("A multi-select answer must be a list of options.")
        selected = [str(option).strip() for option in value]
        if any(option not in question.options for option in selected):
            raise ValueError("A selected answer is not one of the available options.")
        return json.dumps(selected, separators=(",", ":"))
    if isinstance(value, list):
        raise ValueError("Only multi-select questions accept multiple selected options.")
    return str(value).strip()


def _process_subject_document(subject_doc):
    """Extract, chunk, and save ContentChunks for a SubjectDocument."""
    pages = DocumentProcessor.extract(subject_doc.file.path)
    structured = DocumentProcessor.structure_documents(pages, document_title=subject_doc.title)
    chunks = ChunkingService.chunker(structured)
    ContentChunk.objects.filter(document=subject_doc).delete()
    for idx, chunk in enumerate(chunks):
        ContentChunk.objects.create(
            document=subject_doc,
            chunk_index=idx,
            chunk_text=chunk.page_content,
            metadata=chunk.metadata or {},
        )


def _rebuild_subject_topic_indexes(subject):
    """Rebuild derived topic indexes after subject source content changes."""
    for topic_id in subject.topics.values_list("topic_id", flat=True):
        KnowledgeService(topic_id).rebuild_topic_index()


def _is_boilerplate_topic_title(title):
    normalized = re.sub(r"[^a-z0-9]+", " ", str(title).casefold()).strip()
    boilerplate_titles = {
        "about the tutorial",
        "tutorial overview",
        "audience",
        "prerequisite",
        "prerequisites",
        "copyright",
        "disclaimer",
        "copyright and disclaimer",
        "audience prerequisites copyright and disclaimer",
        "preface",
        "acknowledgement",
        "acknowledgements",
        "acknowledgment",
        "acknowledgments",
        "references",
        "bibliography",
    }
    words = set(normalized.split())
    return (
        normalized in boilerplate_titles
        or {"audience", "prerequisites"}.issubset(words)
        or {"copyright", "disclaimer"}.issubset(words)
    )


def _filter_topic_proposals(proposals):
    return [
        proposal
        for proposal in proposals
        if isinstance(proposal, dict)
        and proposal.get("title")
        and not _is_boilerplate_topic_title(proposal["title"])
    ]


def _generate_topic_proposals(subject_doc):
    """Extract text from the subject document and ask the LLM to propose topics."""
    try:
        pages = DocumentProcessor.extract(subject_doc.file.path)
    except Exception:
        return []

    full_text = "\n".join(p.page_content for p in pages)[:12000]

    prompt = (
        "You are a curriculum designer. Given the following document content, "
        "identify only the instructional subject-matter topics a student should learn. "
        "Ignore administrative sections such as About the Tutorial, Audience, "
        "Prerequisites, Copyright, Disclaimer, Preface, Acknowledgements, "
        "References, and Bibliography. Use a Table of Contents as an outline "
        "to identify and organize chapter or topic names, but never propose "
        "'Table of Contents' itself as a topic. Use index terms only as clues "
        "when they are supported by the instructional content; never propose "
        "'Index' itself as a topic. "
        "Return a JSON array where each element has: "
        "\"title\" (string), \"description\" (string, 1-2 sentences). "
        "Return ONLY the JSON array, no markdown, no explanation.\n\n"
        f"Document:\n{full_text}"
    )

    try:
        llm = AssessmentLLM()
        result = llm.invoke_json(prompt)
        if isinstance(result, list):
            return _filter_topic_proposals(result)
        return []
    except Exception:
        return []


class SubjectDocumentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, subject_id, document_id=None):
        subject = get_object_or_404(Subject, subject_id=subject_id, created_by=request.user)
        if document_id is not None:
            document = get_object_or_404(SubjectDocument, id=document_id, subject=subject)
            return Response({"document": SubjectDocumentSerializer(document).data})
        docs = subject.source_documents.all()
        return Response({"documents": SubjectDocumentSerializer(docs, many=True).data})

    def post(self, request, subject_id):
        subject = get_object_or_404(Subject, subject_id=subject_id, created_by=request.user)
        serializer = SubjectDocumentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        subject_doc = serializer.save(subject=subject, processing_status=SubjectDocument.ProcessingStatus.PROCESSING)

        proposal = None
        try:
            _process_subject_document(subject_doc)
            proposals_data = _generate_topic_proposals(subject_doc)
            if proposals_data:
                proposal = TopicProposal.objects.create(
                    document=subject_doc,
                    raw_response={"items": proposals_data},
                )
                for idx, item in enumerate(proposals_data):
                    TopicProposalItem.objects.create(
                        proposal=proposal,
                        title=item.get("title", ""),
                        description=item.get("description", ""),
                        display_order=idx,
                    )
                subject_doc.processing_status = SubjectDocument.ProcessingStatus.AWAITING_REVIEW
            else:
                subject_doc.processing_status = SubjectDocument.ProcessingStatus.PROCESSED
        except Exception:
            subject_doc.processing_status = SubjectDocument.ProcessingStatus.FAILED

        subject_doc.save(update_fields=["processing_status"])

        proposal_data = TopicProposalSerializer(proposal).data if proposal else None

        return Response({
            "message": "Document uploaded. Review the proposed topics.",
            "document": SubjectDocumentSerializer(subject_doc).data,
            "proposal": proposal_data,
        }, status=status.HTTP_201_CREATED)

    def put(self, request, subject_id, document_id=None):
        subject = get_object_or_404(Subject, subject_id=subject_id, created_by=request.user)
        document_id = document_id or request.data.get("document_id")
        document = get_object_or_404(SubjectDocument, id=document_id, subject=subject)
        file_changed = "file" in request.FILES or "file" in request.data

        serializer = SubjectDocumentSerializer(document, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        if file_changed:
            try:
                document.processing_status = SubjectDocument.ProcessingStatus.PROCESSING
                document.save(update_fields=["processing_status"])
                _process_subject_document(document)
                document.processing_status = SubjectDocument.ProcessingStatus.PROCESSED
            except Exception:
                document.processing_status = SubjectDocument.ProcessingStatus.FAILED
                document.save(update_fields=["processing_status"])
                return Response(
                    {"message": "Document updated but processing failed."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            document.save(update_fields=["processing_status"])
            _rebuild_subject_topic_indexes(subject)

        return Response({
            "message": "Document updated successfully.",
            "document": SubjectDocumentSerializer(document).data,
        })

    def delete(self, request, subject_id, document_id=None):
        subject = get_object_or_404(Subject, subject_id=subject_id, created_by=request.user)
        document_id = document_id or request.data.get("document_id") or request.query_params.get("document_id")
        document = get_object_or_404(SubjectDocument, id=document_id, subject=subject)

        generated_topic_ids = list(
            TopicProposalItem.objects.filter(
                proposal__document=document,
                approved_topic__isnull=False,
            ).values_list("approved_topic_id", flat=True)
        )

        with transaction.atomic():
            document.delete()
            Topic.objects.filter(topic_id__in=generated_topic_ids).delete()

        _rebuild_subject_topic_indexes(subject)
        return Response({"message": "Document deleted successfully."}, status=status.HTTP_200_OK)


class TopicProposalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, subject_id):
        subject = get_object_or_404(Subject, subject_id=subject_id, created_by=request.user)
        proposal = (
            TopicProposal.objects
            .filter(document__subject=subject, status=TopicProposal.Status.PENDING)
            .order_by("-created_at")
            .first()
        )
        if not proposal:
            return Response({"proposal": None})
        return Response({"proposal": TopicProposalSerializer(proposal).data})

    def post(self, request, subject_id):
        subject = get_object_or_404(Subject, subject_id=subject_id, created_by=request.user)
        proposal_id = request.data.get("proposal_id")
        approved_ids = request.data.get("approved_item_ids", [])

        proposal = get_object_or_404(TopicProposal, id=proposal_id, document__subject=subject)

        created_topics = []
        with transaction.atomic():
            for item in proposal.items.filter(id__in=approved_ids):
                topic = Topic.objects.create(
                    subject=subject,
                    title=item.title,
                    description=item.description,
                    difficulty="medium",
                    estimated_time=30,
                )
                item.approved_topic = topic
                item.is_approved = True
                item.save(update_fields=["approved_topic", "is_approved"])
                created_topics.append({"id": topic.topic_id, "title": topic.title})

            proposal.status = TopicProposal.Status.APPROVED
            proposal.reviewed_at = timezone.now()
            proposal.save(update_fields=["status", "reviewed_at"])

        return Response({
            "message": f"{len(created_topics)} topic(s) created.",
            "topics": created_topics,
        }, status=status.HTTP_201_CREATED)


class DocumentsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, topic_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        documents = topic.documents_list.all()
        serializer = DocumentSerializer(documents, many=True)
        return Response({"message": "Documents Retrived successfully", "documents": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, topic_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        serializer = DocumentSerializer(data=request.data)
        if serializer.is_valid():
            document = serializer.save(topic=topic)
            knowledge_service = KnowledgeService(topic_id)
            knowledge_service.process_document(document)
            return Response({"message": "Document Created Successfully", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"message": "Invalid data provided.", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, topic_id, doc_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        document = get_object_or_404(TopicDocument, id=doc_id, topic=topic)
        serializer = DocumentSerializer(document)
        return Response({"message": "Document Retrieved Successfully", "data": serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, topic_id, doc_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        document = get_object_or_404(TopicDocument, id=doc_id, topic=topic)
        serializer = DocumentSerializer(document, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Document Updated Successfully", "data": serializer.data}, status=status.HTTP_200_OK)
        return Response({"message": "Invalid data provided", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, topic_id, doc_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        document = get_object_or_404(TopicDocument, id=doc_id, topic=topic)
        knowledge_service = KnowledgeService(topic.topic_id)
        document.delete()
        knowledge_service.rebuild_topic_index()
        return Response({"message": "Document Deleted Successfully"}, status=status.HTTP_200_OK)


class ConversationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, topic_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        serializer = ConversationSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(topic=topic)
            return Response({"message": "Conversation Created Successfully", "data": serializer.data}, status=status.HTTP_201_CREATED)

    def get(self, request, topic_id, conversation_id=None):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        if conversation_id:
            convo_details = get_object_or_404(Conversation, id=conversation_id, topic=topic)
            serializer = ConversationSerializer(convo_details)
            return Response({"message": "Chat details retrieved  Successfully", "data": serializer.data}, status=status.HTTP_200_OK)
        conversations = Conversation.objects.filter(topic=topic)
        serializer = ConversationSerializer(conversations, many=True)
        return Response({"message": "Conversations Retrieved Successfully", "data": serializer.data}, status=status.HTTP_200_OK)

    def delete(self, request, topic_id, conversation_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        conversation = get_object_or_404(Conversation, id=conversation_id, topic=topic)
        conversation.delete()
        return Response({"message": "Conversation Deleted Successfully"}, status=status.HTTP_200_OK)


class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def validate_topic(self, topic_id, user):
        return get_object_or_404(Topic, topic_id=topic_id, subject__created_by=user)

    def validate_conversation(self, conversation_id, topic):
        return get_object_or_404(Conversation, id=conversation_id, topic=topic)

    def get(self, request, topic_id, conversation_id):
        topic = self.validate_topic(topic_id, request.user)
        conversation = self.validate_conversation(conversation_id, topic)
        messages = Message.objects.filter(conversation=conversation)
        serializer = MessageSerializer(messages, many=True)
        return Response({"message": "Messages Retrieved Successfully", "data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, topic_id, conversation_id):
        topic = self.validate_topic(topic_id, request.user)
        conversation = self.validate_conversation(conversation_id, topic)
        question = request.data.get('content')
        previous_messages = Message.objects.filter(conversation=conversation).order_by("created_at")
        chat_history = []
        for message in previous_messages:
            if message.role == Message.Role.USER:
                chat_history.append(HumanMessage(content=message.content))
            elif message.role == Message.Role.ASSISTANT:
                chat_history.append(AIMessage(content=message.content))
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(conversation=conversation, role='user')

        document_names = get_document_names(topic_id)
        agent = TutorGraph(topic_id, document_names, conversation_id)
        answer = agent.invoke(question, chat_history)
        for event in agent.stream(question, chat_history):
            print(event)

        if answer["status"] == "ERROR":
            return Response({"from": "Graph Agent", "message": "Agent execution failed", "data": answer}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        result = answer["answer"]
        serializer_ans = MessageSerializer(data={'content': result})
        if serializer_ans.is_valid(raise_exception=True):
            serializer_ans.save(conversation=conversation, role='assistant')
            return Response({"message": 'Message sent successfully', "data": serializer_ans.data}, status=status.HTTP_201_CREATED)


class ResumeChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id, topic_id):
        decision = request.data.get('decision')
        if decision not in ["approve", "reject"]:
            return Response({"message": "Invalid Decision"}, status=status.HTTP_406_NOT_ACCEPTABLE)
        document_names = get_document_names(topic_id)
        agent = TutorGraph(topic_id, document_names, conversation_id)
        result = agent.resume(decision)
        serializer = MessageSerializer(data={'content': result['answer']})
        if serializer.is_valid(raise_exception=True):
            serializer.save(conversation_id=conversation_id, role='assistant')
            return Response({"data": result}, status=status.HTTP_200_OK)


class AssessmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_topic(self, topic_id, user):
        return get_object_or_404(Topic, topic_id=topic_id, subject__created_by=user)

    def get(self, request, topic_id):
        topic = self.get_topic(topic_id, request.user)
        assessments = topic.assessments.all()
        return Response({"data": AssessmentSerializer(assessments, many=True).data})

    def post(self, request, topic_id):
        topic = self.get_topic(topic_id, request.user)
        try:
            question_count = int(request.data.get("question_count", 10))
        except (TypeError, ValueError):
            return Response({"message": "question_count must be a whole number."}, status=status.HTTP_400_BAD_REQUEST)
        if not 1 <= question_count <= 30:
            return Response({"message": "question_count must be between 1 and 30."}, status=status.HTTP_400_BAD_REQUEST)

        question_type_counts = request.data.get("question_type_counts")
        if question_type_counts is not None:
            if not isinstance(question_type_counts, dict):
                return Response({"message": "question_type_counts must be an object."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                question_type_counts = {
                    question_type: int(question_type_counts.get(question_type, 0))
                    for question_type in ("mcq", "multi_select", "short_answer", "coding")
                }
            except (TypeError, ValueError):
                return Response({"message": "Question type counts must be whole numbers."}, status=status.HTTP_400_BAD_REQUEST)
            if any(count < 0 for count in question_type_counts.values()):
                return Response({"message": "Question type counts cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)
            if sum(question_type_counts.values()) != question_count:
                return Response({"message": "Question type counts must equal question_count."}, status=status.HTTP_400_BAD_REQUEST)

        assessment = Assessment.objects.create(topic=topic, title=request.data.get("title", ""))
        try:
            AssessmentGenerationService(topic_id).generate(
                assessment,
                question_count,
                question_type_counts=question_type_counts,
            )
        except (RuntimeError, ValueError) as error:
            assessment.metadata = {"generation_error": str(error)}
            assessment.save(update_fields=["metadata", "updated_at"])
            return Response({"message": "Assessment generation failed.", "detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"message": "Assessment created successfully.", "data": AssessmentSerializer(assessment).data}, status=status.HTTP_201_CREATED)


class AssessmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_assessment(self, assessment_id, user):
        return get_object_or_404(Assessment.objects.select_related("topic"), id=assessment_id, topic__subject__created_by=user)

    def get(self, request, assessment_id):
        assessment = self.get_assessment(assessment_id, request.user)
        return Response({"data": AssessmentSerializer(assessment).data})


class AssessmentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assessments = (
            Assessment.objects.filter(topic__subject__created_by=request.user, status=Assessment.Status.COMPLETED)
            .select_related("topic", "topic__subject")
            .order_by("-completed_at", "-created_at")
        )
        return Response({"data": AssessmentHistorySerializer(assessments, many=True).data})


class AssessmentInProgressView(APIView):
    """Return all in-progress assessments for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assessments = (
            Assessment.objects.filter(topic__subject__created_by=request.user, status=Assessment.Status.IN_PROGRESS)
            .select_related("topic", "topic__subject")
            .order_by("-updated_at")
        )
        return Response({"data": AssessmentHistorySerializer(assessments, many=True).data})


class AssessmentStartView(AssessmentDetailView):
    permission_classes = [IsAuthenticated]

    def post(self, request, assessment_id):
        assessment = self.get_assessment(assessment_id, request.user)
        if assessment.status == Assessment.Status.COMPLETED:
            return Response({"message": "A completed assessment cannot be restarted."}, status=status.HTTP_409_CONFLICT)
        if not assessment.questions.exists():
            return Response({"message": "This assessment has no generated questions."}, status=status.HTTP_400_BAD_REQUEST)
        assessment.status = Assessment.Status.IN_PROGRESS
        assessment.started_at = assessment.started_at or timezone.now()
        assessment.save(update_fields=["status", "started_at", "updated_at"])
        return Response({"data": AssessmentSerializer(assessment).data})


class AssessmentAnswerSaveView(AssessmentDetailView):
    permission_classes = [IsAuthenticated]

    def post(self, request, assessment_id):
        assessment = self.get_assessment(assessment_id, request.user)
        if assessment.status != Assessment.Status.IN_PROGRESS:
            return Response({"message": "Start the assessment before saving answers."}, status=status.HTTP_409_CONFLICT)
        question_id = request.data.get("question_id")
        if not question_id:
            return Response({"message": "question_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        question = get_object_or_404(assessment.questions, id=question_id)
        try:
            user_answer = _normalise_assessment_answer(question, request.data.get("answer", ""))
        except ValueError as error:
            return Response({"message": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        answer, _ = AssessmentAnswer.objects.update_or_create(
            assessment=assessment, question=question,
            defaults={"user_answer": user_answer},
        )
        return Response({"message": "Answer saved.", "data": AssessmentAnswerSerializer(answer).data})


class AssessmentSubmitView(AssessmentDetailView):
    permission_classes = [IsAuthenticated]

    def post(self, request, assessment_id):
        assessment = self.get_assessment(assessment_id, request.user)
        if assessment.status != Assessment.Status.IN_PROGRESS:
            return Response({"message": "Start the assessment before submitting answers."}, status=status.HTTP_409_CONFLICT)
        submitted_answers = request.data.get("answers")
        if not isinstance(submitted_answers, list):
            return Response({"message": "answers must be a list of question_id and answer values."}, status=status.HTTP_400_BAD_REQUEST)

        questions = {question.id: question for question in assessment.questions.all()}
        submitted_ids = []
        normalised_answers = []
        for submitted in submitted_answers:
            if not isinstance(submitted, dict):
                return Response({"message": "Each answer must be an object."}, status=status.HTTP_400_BAD_REQUEST)
            question_id = submitted.get("question_id")
            if question_id not in questions or question_id in submitted_ids:
                return Response({"message": "Answers must contain each assessment question exactly once."}, status=status.HTTP_400_BAD_REQUEST)
            submitted_ids.append(question_id)
            question = questions[question_id]
            try:
                user_answer = _normalise_assessment_answer(question, submitted.get("answer", ""))
            except ValueError as error:
                return Response({"message": str(error)}, status=status.HTTP_400_BAD_REQUEST)
            normalised_answers.append((question, user_answer))

        if set(submitted_ids) != set(questions):
            return Response({"message": "Submit an answer for every assessment question."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for question, user_answer in normalised_answers:
                AssessmentAnswer.objects.update_or_create(
                    assessment=assessment, question=question,
                    defaults={"user_answer": user_answer},
                )

        try:
            report = AssessmentEvaluationService(assessment).evaluate()
        except (RuntimeError, ValueError) as error:
            return Response({"message": "Answers were saved but evaluation failed.", "detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        answers = assessment.answers.select_related("question")
        return Response({
            "message": "Assessment completed successfully.",
            "report": report,
            "answers": AssessmentAnswerReviewSerializer(answers, many=True).data,
        })


class AssessmentReportView(AssessmentDetailView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        assessment = self.get_assessment(assessment_id, request.user)
        if assessment.status != Assessment.Status.COMPLETED:
            return Response({"message": "The report is available after assessment submission."}, status=status.HTTP_409_CONFLICT)
        return Response({
            "data": AssessmentSerializer(assessment).data,
            "answers": AssessmentAnswerReviewSerializer(
                assessment.answers.select_related("question"), many=True
            ).data,
        })
    
class AssessmentResumeView(AssessmentDetailView):
    """Return assessment + already-saved answers so the frontend can restore state."""
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        assessment = self.get_assessment(assessment_id, request.user)
        if assessment.status == Assessment.Status.DRAFT:
            return Response({"message": "Assessment has not been started yet."}, status=status.HTTP_409_CONFLICT)

        saved_answers = {
            str(a.question_id): a.user_answer
            for a in assessment.answers.all()
        }
        questions = list(assessment.questions.values_list("id", flat=True))
        resume_index = next(
            (i for i, qid in enumerate(questions) if str(qid) not in saved_answers),
            len(questions) - 1,
        )
        return Response({
            "data": AssessmentSerializer(assessment).data,
            "saved_answers": saved_answers,
            "resume_index": resume_index,
        })


class DocumentExtractionVerifyView(APIView):
    """Return per-chunk extraction quality info for a TopicDocument."""
    permission_classes = [IsAuthenticated]

    def get(self, request, topic_id, doc_id):
        topic = get_object_or_404(Topic, topic_id=topic_id, subject__created_by=request.user)
        document = get_object_or_404(TopicDocument, id=doc_id, topic=topic)
        chunks = document.chunks.order_by("chunk_index")

        chunk_data = []
        total_chars = 0
        empty_chunks = 0
        for chunk in chunks:
            text = chunk.chunk_text or ""
            char_count = len(text)
            total_chars += char_count
            is_empty = char_count < 20
            if is_empty:
                empty_chunks += 1
            chunk_data.append({
                "chunk_index": chunk.chunk_index,
                "char_count": char_count,
                "preview": text[:120],
                "is_empty": is_empty,
                "metadata": chunk.meta_data,
            })

        total = len(chunk_data)
        return Response({
            "document_id": doc_id,
            "title": document.title,
            "file_type": document.file_type,
            "processing_status": document.processing_status,
            "total_chunks": total,
            "empty_chunks": empty_chunks,
            "total_chars": total_chars,
            "avg_chars_per_chunk": round(total_chars / total, 1) if total else 0,
            "quality": "good" if total > 0 and empty_chunks / max(total, 1) < 0.2 else "poor" if total == 0 else "partial",
            "chunks": chunk_data,
        })

