#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "Error: AWS_ACCOUNT_ID environment variable is required"
    exit 1
fi

echo "🚀 Deploying Gravity Canvas to $ENVIRONMENT environment..."

echo "📦 Building and pushing Docker images..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

cd backend
docker build -t gravity-canvas-backend .
docker tag gravity-canvas-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gravity-canvas-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gravity-canvas-backend:latest

cd ..
docker build -t gravity-canvas-frontend .
docker tag gravity-canvas-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gravity-canvas-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gravity-canvas-frontend:latest

echo "☁️ Deploying infrastructure with CDK..."
cd aws-infrastructure
npm ci
npx cdk deploy GravityCanvas-$ENVIRONMENT --require-approval never --context environment=$ENVIRONMENT

echo "🔄 Updating ECS services..."
aws ecs update-service \
    --cluster GravityCanvas-$ENVIRONMENT-GravityCanvasCluster \
    --service GravityCanvas-$ENVIRONMENT-BackendService \
    --force-new-deployment \
    --region $AWS_REGION

echo "📁 Deploying frontend to S3..."
cd ..
npm ci
npm run build

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name GravityCanvas-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
    --output text \
    --region $AWS_REGION)

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name GravityCanvas-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text \
    --region $AWS_REGION)

aws s3 sync dist/ s3://$S3_BUCKET --delete --region $AWS_REGION
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*" --region $AWS_REGION

echo "✅ Deployment completed successfully!"

FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name GravityCanvas-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" \
    --output text \
    --region $AWS_REGION)

BACKEND_URL=$(aws cloudformation describe-stacks \
    --stack-name GravityCanvas-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='BackendURL'].OutputValue" \
    --output text \
    --region $AWS_REGION)

echo "🌐 Frontend URL: $FRONTEND_URL"
echo "🔗 Backend URL: $BACKEND_URL"

echo "🏥 Running health checks..."
sleep 30

if curl -f "$BACKEND_URL/health"; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

if curl -f "$FRONTEND_URL"; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo "🎉 All health checks passed! Deployment successful."
