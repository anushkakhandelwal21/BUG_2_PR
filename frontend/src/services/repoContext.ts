export interface RepositoryContext {
  id: string;
  name: string;
  owner: string;
  isDemo: boolean;
  defaultBranch: string;
  description?: string;
}

export interface GitHubAccount {
  username: string;
  displayName: string;
  connectedAt: string;
}

const STORAGE_KEY_REPO = 'fixtrail_active_repo_v1';
const STORAGE_KEY_GH = 'fixtrail_github_conn_v1';

export const DEMO_REPOSITORIES: RepositoryContext[] = [
  {
    id: 'bug-2-pr',
    name: 'BUG_2_PR',
    owner: 'anushkakhandelwal21',
    isDemo: false,
    defaultBranch: 'main',
    description: 'Autonomous Bug Resolution Platform — From Issue to Verified PR',
  },
  {
    id: 'demo-sample',
    name: 'sample-service',
    owner: 'demo-org',
    isDemo: true,
    defaultBranch: 'main',
    description: 'Autonomous bug resolution demonstration repository',
  },
  {
    id: 'oss-express',
    name: 'express',
    owner: 'expressjs',
    isDemo: true,
    defaultBranch: 'master',
    description: 'Fast, unopinionated, minimalist web framework for node',
  },
  {
    id: 'oss-flask',
    name: 'flask',
    owner: 'pallets',
    isDemo: true,
    defaultBranch: 'main',
    description: 'The Python micro framework for building web applications',
  },
];

class RepoContextStore {
  private activeRepo: RepositoryContext;
  private githubAccount: GitHubAccount | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Check saved state
    const savedGh = localStorage.getItem(STORAGE_KEY_GH);
    if (savedGh) {
      try {
        this.githubAccount = JSON.parse(savedGh);
      } catch {
        this.githubAccount = null;
      }
    }

    const savedRepoId = localStorage.getItem(STORAGE_KEY_REPO);
    const found = DEMO_REPOSITORIES.find((r) => r.id === savedRepoId);
    this.activeRepo = found || DEMO_REPOSITORIES[0];
  }

  public getActiveRepository(): RepositoryContext {
    return this.activeRepo;
  }

  public getFormattedRepoName(): string {
    return `${this.activeRepo.owner}/${this.activeRepo.name}`;
  }

  public getAvailableRepositories(): RepositoryContext[] {
    return [...DEMO_REPOSITORIES];
  }

  public setActiveRepository(repoId: string) {
    const found = DEMO_REPOSITORIES.find((r) => r.id === repoId);
    if (found) {
      this.activeRepo = found;
      localStorage.setItem(STORAGE_KEY_REPO, found.id);
      this.notify();
    }
  }

  public isGitHubConnected(): boolean {
    return this.githubAccount !== null;
  }

  public getConnectedAccount(): GitHubAccount | null {
    return this.githubAccount;
  }

  public connectGitHub(username = 'developer-preview', displayName = 'Developer Preview') {
    this.githubAccount = {
      username,
      displayName,
      connectedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_GH, JSON.stringify(this.githubAccount));
    this.notify();
  }

  public disconnectGitHub() {
    this.githubAccount = null;
    localStorage.removeItem(STORAGE_KEY_GH);
    this.notify();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const repoContextStore = new RepoContextStore();
