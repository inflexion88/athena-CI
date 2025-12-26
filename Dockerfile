# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the Vite app (produces 'dist' folder)
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install simplified dependencies (production only)
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copy the build artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server script
COPY server.js .

# Expose the port default for Cloud Run
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
