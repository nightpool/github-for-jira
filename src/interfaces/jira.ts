export interface JiraPullRequest {
	commit: {
		id: string;
		repositoryUri: string;
	};
	ref: {
		name: string;
		uri: string;
	};
}

export interface JiraBuild {
	schemaVersion: string;
	pipelineId: string;
	buildNumber: number;
	updateSequenceNumber: number;
	displayName: string;
	url: string;
	state: string;
	lastUpdated: string;
	issueKeys: string[];
	references?: JiraPullRequest[];
}

export interface JiraBuildData {
	product: string;
	builds: JiraBuild[];
}

export interface JiraCommit {
	author: JiraAuthor;
	authorTimestamp: string;
	displayId: string;
	fileCount: number;
	hash: string;
	id: string;
	issueKeys: string[];
	message: string;
	url: string;
	updateSequenceId: number;

	files?: JiraCommitFile[];
	flags?: string[];
}

export interface JiraIssue {
	id: string;
	self: string;
	key: string;
	fields:{
		summary: string;
	};
}

export interface JiraCommitFile {
	path: string;
	changeType: string;
	linesAdded?: string[];
	linesRemoved?: string[];
	url: string;
}

export interface JiraAuthor {
	avatar?: string;
	email: string;
	name: string;
	url?: string;
}

export interface JiraCommitData {
	commits: JiraCommit[];
	id: string;
	name: string;
	url: string;
	updateSequenceId: number;
}

export interface JiraDeployment {
	schemaVersion: string;
	deploymentSequenceNumber: number;
	updateSequenceNumber: number;
	issueKeys: string[],
	displayName: string;
	url: string;
	description: string;
	lastUpdated: Date;
	state: string;
	pipeline: {
		id: string;
		displayName: string;
		url: string;
	},
	environment: {
		id: string;
		displayName: string;
		type: string;
	},
}

export interface JiraDeploymentData {
	deployments: JiraDeployment[];
}
