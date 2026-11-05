# RizogCAD: isolated LibreDWG builder (GPLv3) and Python PDF backend.
FROM debian:bookworm-slim AS cadbuild
ARG LIBREDWG_VERSION=0.14
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils build-essential pkg-config \
      zlib1g-dev libpcre2-dev libgmp-dev libxml2-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN curl -fsSL --retry 3 \
      "https://ftp.gnu.org/gnu/libredwg/libredwg-0.14.tar.xz" \
      -o libredwg.tar.xz \
 && mkdir libredwg \
 && tar -xJf libredwg.tar.xz -C libredwg --strip-components=1
WORKDIR /src/libredwg
RUN ./configure --disable-python --disable-bindings --disable-shared \
      --enable-static --disable-werror \
 && make -j2 \
 && install -Dm755 programs/dwg2dxf /out/dwg2dxf \
 && /out/dwg2dxf --version

FROM python:3.12-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=10000 \
    MPLCONFIGDIR=/tmp/matplotlib
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpcre2-8-0 libgmp10 libxml2 zlib1g libstdc++6 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --create-home --uid 10001 rizog
WORKDIR /app
COPY --from=cadbuild /out/dwg2dxf /usr/local/bin/dwg2dxf
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
 && dwg2dxf --version
COPY --chown=rizog:rizog index.html server.py smoke_test.py /app/
RUN chown -R rizog:rizog /app \
 && mkdir -p /tmp/rizogcad && chown rizog:rizog /tmp/rizogcad
USER 10001
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD python -c "from urllib.request import urlopen; assert urlopen('http://127.0.0.1:10000/api/health',timeout=3).status==200"
CMD ["sh","-c","python -m uvicorn server:app --host 0.0.0.0 --port $PORT --workers 1 --proxy-headers"]
