// Jenkinsfile — Constra AI CI/CD pipeline
//
// Jenkins and the deploy target are THE SAME shared host (103.192.198.240),
// which also runs unrelated production stacks (CRM, HMS, VerifyChain, EMS,
// etc). This pipeline is deliberately scoped to only ever touch:
//   /opt/constra-ai        (its own deploy directory)
//   the "constra-ai" container / "constra-ai-net" network
//   host port 7030 (see docker-compose.yml)
// It never runs `docker system prune`, never touches other containers/
// networks/volumes, and never uses `docker compose down` without `--rmi local`
// scoping to this project only.
//
// Required Jenkins credentials:
//   constraai-env-production   (Secret file) - filled-in .env.production
//
// Required: the Jenkins service user must be in the `docker` group
// (`usermod -aG docker jenkins && systemctl restart jenkins`) and must own
// /opt/constra-ai. No SSH credential needed — this all runs on the Jenkins
// agent itself.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        DEPLOY_PATH = '/opt/constra-ai'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install, typecheck & test (ephemeral Node container)') {
            steps {
                sh """
                    docker run --rm -v \$(pwd):/app -w /app node:22-slim sh -c "
                        corepack enable &&
                        corepack prepare pnpm@10.15.1 --activate &&
                        pnpm install --frozen-lockfile &&
                        pnpm check &&
                        pnpm test
                    "
                """
            }
        }

        stage('Place env file') {
            steps {
                withCredentials([file(credentialsId: 'constraai-env-production', variable: 'ENV_FILE')]) {
                    sh 'cp "$ENV_FILE" .env.production'
                }
            }
        }

        stage('Build image') {
            steps {
                sh 'docker compose -p constra-ai build'
            }
        }

        stage('Run DB migrations') {
            steps {
                sh """
                    docker run --rm --env-file .env.production constra-ai:local \
                        sh -c 'corepack enable && pnpm exec drizzle-kit migrate'
                """
            }
        }

        stage('Deploy (docker compose up, scoped to this project only)') {
            steps {
                sh 'docker compose -p constra-ai up -d --remove-orphans'
            }
        }

        stage('Post-deploy health check') {
            steps {
                sh """
                    for i in 1 2 3 4 5; do
                        if curl -fsS http://127.0.0.1:\${HOST_PORT:-7030}/ >/dev/null; then
                            echo "Health check passed"
                            exit 0
                        fi
                        echo "Retrying health check (\$i/5)..."
                        sleep 5
                    done
                    echo "Health check FAILED after deploy"
                    exit 1
                """
            }
        }
    }

    post {
        always {
            // Clean workspace copy of the secret env file; the real one stays
            // only inside the container via env_file, never committed.
            sh 'rm -f .env.production'
        }
        failure {
            echo "Build/deploy failed. Check: docker compose -p constra-ai logs — do NOT run docker system prune or docker compose down on other projects on this host."
        }
    }
}
