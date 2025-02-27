import { Repository } from "../models/subscription";

export const getRepositorySummary = (repo: Repository): Repository => ({
	id: repo.id,
	name: repo.name,
	full_name: repo.full_name,
	owner: { login: repo.owner.login },
	html_url: repo.html_url,
	updated_at: repo.updated_at
});
