# Base Docker image
FROM apify/actor-node-puppeteer-chrome:20 AS builder

# Set the working directory
WORKDIR /usr/src/app

# Check preinstalled packages
RUN npm ls crawlee apify puppeteer playwright

# Copy just package.json and package-lock.json to speed up the build using Docker layer cache.
COPY package*.json ./

# Install all dependencies. Don't audit to speed up the installation.
RUN npm install --include=dev --audit=false

# Copy the source files
COPY . ./

# Build the project
RUN npm run build && ls -la /usr/src/app/dist

# Final image
FROM apify/actor-node-puppeteer-chrome:20

# Set the working directory
WORKDIR /usr/src/app

# Check preinstalled packages
RUN npm ls crawlee apify puppeteer playwright

# Copy just package.json and package-lock.json to speed up the build using Docker layer cache.
COPY package*.json ./

# Install NPM packages, skip optional and development dependencies to keep the image small.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

# Copy built JS files from builder image
COPY --from=builder /usr/src/app/dist /usr/src/app/dist

# Copy the remaining source files
COPY . ./

# Run the image
CMD npm run start:prod --silent
