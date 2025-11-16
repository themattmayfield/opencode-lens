FROM ubuntu:22.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (JavaScript runtime)
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

# Verify Bun works
RUN bun --version

# Install OpenCode CLI via Bun (more reliable in Docker)
RUN /root/.bun/bin/bun install -g opencode-ai

# Verify OpenCode is installed
RUN /root/.bun/bin/opencode --version

# Set working directory for repositories
WORKDIR /home/user

# Default shell
CMD ["/bin/bash"]
