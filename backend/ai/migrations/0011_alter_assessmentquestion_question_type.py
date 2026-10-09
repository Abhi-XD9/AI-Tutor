from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0010_subjectdocument_documentelement_contentchunk_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="assessmentquestion",
            name="question_type",
            field=models.CharField(
                choices=[
                    ("mcq", "Multiple choice"),
                    ("multi_select", "Multiple select"),
                    ("short_answer", "Short answer"),
                    ("coding", "Coding"),
                ],
                max_length=20,
            ),
        ),
    ]