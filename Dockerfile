FROM python:3.10

ENV PYHTHONUNBUFFERED=1

WORKDIR /code

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput -v 3 || true

EXPOSE 8080

CMD ["python", "manage.py", "runserver", "0.0.0.0:8080"]