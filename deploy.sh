#!/bin/bash

# Configuration
PROJECT_ID="YOUR_GOOGLE_CLOUD_PROJECT_ID"
APP_NAME="athena-intel"
REGION="us-central1"

echo "Deploying $APP_NAME to Google Cloud Run..."

# Build and Submit the container to Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME

# Deploy to Cloud Run
gcloud run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,ELEVENLABS_AGENT_ID=$ELEVENLABS_AGENT_ID

echo "Deployment Complete!"
