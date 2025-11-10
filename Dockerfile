# 1. Use the official Node.js 20 image (required by your version of Next.js)
FROM node:20

# 2. Set the working directory inside the container
WORKDIR /app

# 3. This is the magic step: Install all the system dependencies that 'canvas' needs.
RUN apt-get update && apt-get install -y \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev

# 4. Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# 5. Run npm install. This will now find the system libraries and
#    successfully compile 'canvas' and install devDependencies like '@tailwindcss/postcss'.
RUN npm install

# 6. Copy the rest of your project code into the container
COPY . .

# 7. Run your project's build command from your package.json
RUN npm run build --webpack

# 8. Set the environment to production
ENV NODE_ENV=production

# 9. Expose the port Next.js runs on 
EXPOSE 3000

# 10. Set the command to start your app using your package.json script
CMD ["npm", "run", "start"]