#!/bin/bash

# Production Deployment Script for Peer Care Connect
# This script handles the complete production deployment process

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for Peer Care Connect"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if required tools are installed
check_requirements() {
    print_status "Checking deployment requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    print_success "All requirements met"
}

# Validate environment configuration
validate_environment() {
    print_status "Validating environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        print_status "Please copy env.production.example to .env.production and fill in your values"
        exit 1
    fi
    
    # Check for required environment variables
    source .env.production
    
    if [ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ] || [ "$VITE_STRIPE_PUBLISHABLE_KEY" = "pk_live_your_live_publishable_key_here" ]; then
        print_error "VITE_STRIPE_PUBLISHABLE_KEY not set or still has placeholder value"
        exit 1
    fi
    
    if [ -z "$STRIPE_SECRET_KEY" ] || [ "$STRIPE_SECRET_KEY" = "your_live_stripe_secret_key_here" ]; then
        print_error "STRIPE_SECRET_KEY not set or still has placeholder value"
        exit 1
    fi
    
    if [ -z "$STRIPE_WEBHOOK_SECRET" ] || [ "$STRIPE_WEBHOOK_SECRET" = "whsec_your_live_webhook_secret_here" ]; then
        print_error "STRIPE_WEBHOOK_SECRET not set or still has placeholder value"
        exit 1
    fi
    
    if [ -z "$VITE_SUPABASE_URL" ] || [ "$VITE_SUPABASE_URL" = "https://your-project-ref.supabase.co" ]; then
        print_error "VITE_SUPABASE_URL not set or still has placeholder value"
        exit 1
    fi
    
    print_success "Environment configuration validated"
}

# Build the application
build_application() {
    print_status "Building application for production..."
    
    # Clean previous builds
    rm -rf dist/
    
    # Install dependencies
    npm ci --only=production
    
    # Build the application
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not created"
        exit 1
    fi
    
    print_success "Application built successfully"
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if already logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        print_status "Please log in to Vercel..."
        vercel login
    fi
    
    # Deploy to production
    vercel --prod --confirm
    
    print_success "Application deployed to Vercel"
}

# Deploy Supabase Edge Functions
deploy_edge_functions() {
    print_status "Deploying Supabase Edge Functions..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Please install it manually:"
        print_status "npm install -g supabase"
        print_warning "Skipping Edge Function deployment"
        return
    fi
    
    # Deploy Edge Functions
    cd supabase/functions
    
    for func in */; do
        if [ -d "$func" ]; then
            func_name=$(basename "$func")
            print_status "Deploying $func_name..."
            supabase functions deploy "$func_name" --project-ref "$VITE_SUPABASE_URL" | sed 's/.*supabase.co//'
        fi
    done
    
    cd ../..
    
    print_success "Edge Functions deployed"
}

# Configure Stripe webhooks
configure_stripe_webhooks() {
    print_status "Configuring Stripe webhooks..."
    
    # Get the deployed URL from Vercel
    DEPLOYED_URL=$(vercel ls --prod | grep peer-care-connect | awk '{print $2}')
    
    if [ -z "$DEPLOYED_URL" ]; then
        print_warning "Could not determine deployed URL. Please configure webhooks manually:"
        print_status "Webhook URL: https://your-domain.vercel.app/api/stripe-webhook"
        return
    fi
    
    print_status "Webhook URL: $DEPLOYED_URL/api/stripe-webhook"
    print_status "Please configure this webhook URL in your Stripe Dashboard:"
    print_status "1. Go to Stripe Dashboard > Developers > Webhooks"
    print_status "2. Add endpoint: $DEPLOYED_URL/api/stripe-webhook"
    print_status "3. Select events: payment_intent.succeeded, account.updated, etc."
    print_status "4. Copy the webhook secret and update your environment variables"
}

# Run tests
run_tests() {
    print_status "Running production tests..."
    
    # Check if test scripts exist
    if [ -d "test-scripts" ]; then
        print_status "Running deployment validation tests..."
        node test-scripts/quick-demo.js
    else
        print_warning "No test scripts found"
    fi
}

# Main deployment process
main() {
    echo
    print_status "Starting production deployment process..."
    
    check_requirements
    validate_environment
    build_application
    deploy_to_vercel
    deploy_edge_functions
    configure_stripe_webhooks
    run_tests
    
    echo
    print_success "🎉 Production deployment completed successfully!"
    echo
    print_status "Next steps:"
    print_status "1. Configure Stripe webhooks in your Stripe Dashboard"
    print_status "2. Test the live payment system with small amounts"
    print_status "3. Monitor logs and transactions"
    print_status "4. Set up monitoring and alerting"
    echo
    print_status "Your application is now live and ready for real transactions!"
}

# Run the main function
main "$@"
