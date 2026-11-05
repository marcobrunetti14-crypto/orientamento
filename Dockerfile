FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data PORT=8080
WORKDIR /app
RUN groupadd --gid 10001 euclide && useradd --uid 10001 --gid euclide --no-create-home euclide && mkdir /data && chown euclide:euclide /data
COPY --chown=euclide:euclide public/ ./public/
COPY --chown=euclide:euclide runtime/ ./runtime/
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=3)"
CMD ["python", "runtime/server.py"]
