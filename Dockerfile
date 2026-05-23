# Dockerfile — Dev container for Mastodon Glitch-Soc
FROM ruby:3.4-slim

WORKDIR /workspaces/mastodon

ENV BASH_ENV="/root/.bashrc"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# System dependencies + build tools + Node.js + Yarn
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    gnupg \
    ca-certificates \
    build-essential \
    libicu-dev \
    libidn11-dev \
    ffmpeg \
    libvips42 \
    libpam-dev \
    python3 \
    python3-pip \
    python3-yaml \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && corepack enable \
    && corepack prepare yarn@4.14.1 --activate \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Ruby tools
RUN gem install bundler -v 4.0.10 --force --no-document \
    && gem install foreman irb --no-document

# Pre-install all gems (dev container needs full bundle including development/test)
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3

# Copy app
COPY . .

EXPOSE 3000 3036

CMD ["bin/dev"]
