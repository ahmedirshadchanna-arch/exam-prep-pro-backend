FROM ubuntu:24.04

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install Node 20, Python 3, and build tools
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app
COPY . .

# Set up Python Virtual Environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies (Force sqlite3 to build natively if needed)
RUN pip install -r requirements.txt
RUN npm install --build-from-source=sqlite3

EXPOSE 3000
CMD ["node", "server.js"]
