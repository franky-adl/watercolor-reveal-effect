dev:
	pnpm dev

deploy:
	rm -rf dist
	pnpm build
	ansible-playbook -i ../ansible/inventory ../ansible/myaws.yml -e "project_name=watercolor-reveal-effect"