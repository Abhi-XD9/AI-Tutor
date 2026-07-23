from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from notifications.utils import send_revision_reminder

User = get_user_model()


class Command(BaseCommand):
    help = "Send daily revision reminder emails"

    def handle(self, *args, **options):

        users = (
            User.objects.filter(
                is_active=True,
                notification_settings__email_reminder=True,
            )
            .select_related("notification_settings")
        )

        emails_sent = 0

        for user in users:
            if send_revision_reminder(user):
                emails_sent += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Reminder process completed. Emails sent: {emails_sent}"
            )
        )