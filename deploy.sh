#!/bin/bash

# Auto-detect Project ID from the current gcloud environment
PROJECT_ID=$(gcloud config get-value project)
APP_NAME="athena-intel"
REGION="us-central1"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No Google Cloud Project ID detected."
  echo "Please run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "Detected Project ID: $PROJECT_ID"

# Prompt for Keys if not set as environment variables
if [ -z "$GEMINI_API_KEY" ]; then
  read -p "Enter your GEMINI_API_KEY: " GEMINI_API_KEY
fi

if [ -z "$ELEVENLABS_AGENT_ID" ]; then
  read -p "Enter your ELEVENLABS_AGENT_ID: " ELEVENLABS_AGENT_ID
fi

echo "Deploying $APP_NAME to Google Cloud Run..."

# Enable necessary services (just in case)
echo "Enabling Cloud Build and Cloud Run APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# Build and Submit the container to Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME

# Deploy to Cloud Run
gcloud run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,ELEVENLABS_AGENT_ID=$ELEVENLABS_AGENT_ID

echo "Deployment Complete! 🚀"
