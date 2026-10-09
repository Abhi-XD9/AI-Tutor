from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("revision", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="TopicRevisionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("plan", models.JSONField(blank=True, default=dict)),
                ("generated_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("topic", models.OneToOneField(on_delete=models.CASCADE, related_name="revision_plan", to="topics.topic")),
            ],
        ),
    ]