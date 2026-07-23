import base64
import os
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from revision.models import RevisionSchedule


def _logo_base64():
    logo_path = os.path.join(settings.BASE_DIR, '..', 'frontned', 'src', 'assets', 'logo11.png')
    try:
        with open(os.path.abspath(logo_path), 'rb') as f:
            return base64.b64encode(f.read()).decode()
    except Exception:
        return ''


def send_revision_reminder(user):

    today = timezone.localdate()

    today_revisions = RevisionSchedule.objects.filter(
        topic__subject__created_by=user,
        scheduled_date=today,
        status="pending",
    ).select_related('topic', 'topic__subject')

    pending_revisions = RevisionSchedule.objects.filter(
        topic__subject__created_by=user,
        scheduled_date__lt=today,
        status="pending",
    ).select_related('topic', 'topic__subject')

    if not today_revisions.exists() and not pending_revisions.exists():
        return False

    html = render_to_string(
        "emails/revision_reminder.html",
        {
            "user": user,
            "today_revisions": today_revisions,
            "pending_revisions": pending_revisions,
            "frontend_url": getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
            "logo_b64": _logo_base64(),
        },
    )

    send_mail(
        subject="📚 Today's Revision Plan",
        message="",
        from_email=None,
        recipient_list=[user.email],
        html_message=html,
    )

    return True