# ============================================
# STAGE 1: BUILDER - Build the frontend
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the application
# For Vite/Vue/React, this usually creates a 'dist' folder
RUN npm run build

# ============================================
# STAGE 2: RUNTIME - Serve with Nginx
# ============================================
FROM nginx:stable-alpine

# Security: Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output from builder stage
# (Verify if your project uses 'dist' or 'build')
COPY --from=builder /app/dist /usr/share/nginx/html

# OPTIONAL: Copy a custom nginx config if you have one
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Use tini or a proper entrypoint for signal handling
CMD ["nginx", "-g", "daemon off;"]
