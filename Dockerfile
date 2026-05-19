# Dockerfile - Fixed for Glitch-Soc (includes build deps for native gems)
FROM ruby:3.4-slim

WORKDIR /workspaces/glitch-soc

# Install system dependencies + build tools + Git + Node.js
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
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Install Bundler and foreman
RUN gem install bundler -v 4.0.10 --force --no-document \
    && gem install foreman irb --no-document

# Environment
ENV BASH_ENV="/root/.bashrc"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Pre-install gems (with development/test excluded)
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local without 'development test' \
    && bundle install --jobs 4 --retry 3

# Copy the rest of the app
COPY . .

# Precompile assets
RUN SECRET_KEY_BASE_DUMMY=1 RAILS_ENV=development bundle exec rails assets:precompile

EXPOSE 3000 3036

CMD ["bin/dev"]