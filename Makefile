HOST=$(shell grep '^HOST=' .env | cut -d '=' -f 2)

install:
	@echo "Installing server..."
	-ssh root@$(HOST) "mkdir -p /opt/poll-maker"
	scp ./.env root@$(HOST):/opt/poll-maker/.env
	scp ./docker-compose.yml root@$(HOST):/opt/poll-maker/docker-compose.yml

deploy:
	@echo "Deploying server..."
	ssh root@$(HOST) "docker pull ghcr.io/mikhail-angelov/poll-maker:latest"
	-ssh root@$(HOST) "cd /opt/poll-maker && docker compose down"
	ssh root@$(HOST) "cd /opt/poll-maker && docker compose up -d"

migrate-remote:
	@echo "Pulling remote production DB..."
	mkdir -p ./tmp
	scp root@$(HOST):/opt/poll-maker/poll-maker.sqlite ./tmp/poll-maker.remote.sqlite
	@echo "Applying Drizzle migrations locally..."
	SQLITE_FILE=./tmp/poll-maker.remote.sqlite npm run db:migrate
	@echo "Uploading migrated DB back to server..."
	scp ./tmp/poll-maker.remote.sqlite root@$(HOST):/opt/poll-maker/poll-maker.sqlite
	rm -f ./tmp/poll-maker.remote.sqlite
	@echo "Remote migration complete!"
