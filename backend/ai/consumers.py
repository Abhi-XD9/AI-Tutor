import json

from channels.generic.websocket import WebsocketConsumer
from django.shortcuts import get_object_or_404

from langchain_core.messages import HumanMessage, AIMessage

from .models import Topic, Conversation, Message
from .serializers import MessageSerializer
from .agents.tutor_graph import TutorGraph
from .models import TopicDocument

def get_document_names(topic_id):

            documents = TopicDocument.objects.filter(
                topic__topic_id=topic_id
            )

            return [
                document.title
                for document in documents
            ]
class ChatConsumer(WebsocketConsumer):

    def connect(self):

        self.topic_id = self.scope["url_route"]["kwargs"]["topic_id"]
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]

        user = self.scope["user"]

        if not user.is_authenticated:


            self.close(code=4001)
            return


        self.topic = get_object_or_404(
            Topic,
            topic_id=self.topic_id,
            subject__created_by=user
        )

        self.conversation = get_object_or_404(
            Conversation,
            id=self.conversation_id,
            topic=self.topic
        )

        self.accept()

        messages = Message.objects.filter(
            conversation=self.conversation
        ).order_by("created_at")

        self.send(text_data=json.dumps({
            "type": "history",
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat()
                }
                for m in messages
            ]
        }))

    def receive(self, text_data):

        try:

            data = json.loads(text_data)
            msg_type = data.get("type")

            if msg_type == "resume":
                self.handle_resume(data.get("decision"))
                return

            question = data.get("content")

            if not question:
                self.send(text_data=json.dumps({"type": "error", "message": "Message content is required."}))
                return

            self.handle_question(question)

        except Exception as e:

            self.send(text_data=json.dumps({"type": "error", "message": str(e)}))

    def handle_resume(self, decision):
        # Subclasses or future implementation can handle resume logic here
        self.send(text_data=json.dumps({"type": "error", "message": "Resume not implemented."}))


    def build_chat_history(self):

        previous_messages = Message.objects.filter(
            conversation=self.conversation
        ).order_by("created_at")

        chat_history = []

        for message in previous_messages:

            if message.role == Message.Role.USER:

                chat_history.append(
                    HumanMessage(
                        content=message.content
                    )
                )

            elif message.role == Message.Role.ASSISTANT:

                chat_history.append(
                    AIMessage(
                        content=message.content
                    )
                )

        return chat_history


    def handle_question(self, question):

        chat_history = self.build_chat_history()

        # Save user message
        serializer = MessageSerializer(
            data={
                "content": question
            }
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            conversation=self.conversation,
            role=Message.Role.USER
        )

        document_names = get_document_names(
            self.topic_id
        )

        agent = TutorGraph(
            self.topic_id,
            document_names,
            self.conversation_id
        )

        full_answer = ""

        for event in agent.stream(
            question,
            chat_history
        ):

            event_type = event.get("type")

            if event_type == "token":

                token = event.get("content", "")

                full_answer += token

                self.send(
                    text_data=json.dumps({
                        "type": "token",
                        "content": token
                    })
                )

            elif event_type == "done":

                self.save_assistant_message(
                    full_answer
                )

                self.send(
                    text_data=json.dumps({
                        "type": "done"
                    })
                )

            elif event_type == "error":

                self.send(
                    text_data=json.dumps({
                        "type": "error",
                        "message": event.get("message")
                    })
                )
    def save_assistant_message(self, answer):

        serializer = MessageSerializer(
            data={
                "content": answer
            }
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            conversation=self.conversation,
            role=Message.Role.ASSISTANT
        )