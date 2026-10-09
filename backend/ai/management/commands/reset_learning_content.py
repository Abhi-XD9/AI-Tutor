"""Reset generated learning content without touching accounts or subjects."""

from django.core.management.base import BaseCommand, CommandError

from ai.models import SubjectDocument, TopicDocument
from topics.models import Topic


class Command(BaseCommand):
    help = "Delete topics, uploaded learning documents, chunks, chats, assessments, and revisions; preserve users and subjects."

    def add_arguments(self, parser):
        parser.add_argument("--confirm", action="store_true", help="Required acknowledgement for this destructive operation.")

    def handle(self, *args, **options):
        if not options["confirm"]:
            raise CommandError("Refusing to reset content. Re-run with --confirm after reviewing the scope.")

        # Cascades remove their chunks, topic mappings, assessments, messages,
        # and revision schedules. Subjects and authentication users are not
        # selected or deleted.
        topic_count = Topic.objects.count()
        subject_document_count = SubjectDocument.objects.count()
        topic_document_count = TopicDocument.objects.count()
        Topic.objects.all().delete()
        SubjectDocument.objects.all().delete()
        TopicDocument.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(
                "Reset complete: "
                f"{topic_count} topics, {subject_document_count} subject documents, "
                f"and {topic_document_count} topic documents removed. Users and subjects were preserved."
            )
        )
