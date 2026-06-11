FROM node:20

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

WORKDIR /app

# Copy all files into the container
COPY . .

# Set up a Python Virtual Environment (Fixes cloud strictness)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python & Node requirements
RUN pip install -r requirements.txt
RUN npm install

# Expose port and run
EXPOSE 3000
CMD ["node", "server.js"]
