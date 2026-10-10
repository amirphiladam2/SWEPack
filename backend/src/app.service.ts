import { Injectable } from '@nestjs/common';

export type Resource = {
  id: string;
  name: string;
  category: string;
  sub: string;
  letter: string;
  color: string;
  description: string;
  url: string;
  type: string;
  saves: string;
};

type ResourceSubmission = Pick<
  Resource,
  'name' | 'url' | 'description' | 'category'
> & {
  subcategory: string;
  tags: string;
  collection?: string;
};

@Injectable()
export class AppService {
  private resources: Resource[] = [
    {
      id: 'shadcn-ui',
      name: 'shadcn/ui',
      category: 'Frontend',
      sub: 'Components',
      letter: 's',
      color: 'purple',
      description:
        'Beautifully designed components that you can copy and paste into your apps.',
      url: 'ui.shadcn.com',
      type: 'React',
      saves: '2.4k saves',
    },
    {
      id: 'neon',
      name: 'Neon',
      category: 'Backend',
      sub: 'Database',
      letter: 'N',
      color: 'mint',
      description:
        'Serverless Postgres with branching, autoscaling, and a generous free tier.',
      url: 'neon.tech',
      type: 'Databases',
      saves: '1.8k saves',
    },
    {
      id: 'roadmap-sh',
      name: 'roadmap.sh',
      category: 'Learning',
      sub: 'Roadmaps',
      letter: 'r',
      color: 'yellow',
      description:
        'Community-driven roadmaps, guides and best practices for developers.',
      url: 'roadmap.sh',
      type: 'Guides',
      saves: '3.1k saves',
    },
    {
      id: 'coolify',
      name: 'Coolify',
      category: 'DevOps & Cloud',
      sub: 'Deployment',
      letter: 'C',
      color: 'violet',
      description:
        'An open-source and self-hostable Heroku and Netlify alternative.',
      url: 'coolify.io',
      type: 'Deploy',
      saves: '946 saves',
    },
    {
      id: 'motion',
      name: 'Motion',
      category: 'Frontend',
      sub: 'Animation',
      letter: 'M',
      color: 'pink',
      description: 'A modern animation library for React and JavaScript.',
      url: 'motion.dev',
      type: 'Animation',
      saves: '1.2k saves',
    },
    {
      id: 'trpc',
      name: 'tRPC',
      category: 'Backend',
      sub: 'APIs',
      letter: 't',
      color: 'blue',
      description:
        'End-to-end typesafe APIs made easy for full-stack TypeScript.',
      url: 'trpc.io',
      type: 'TypeScript',
      saves: '1.6k saves',
    },
  ];
  private readonly savedByVisitor = new Map<string, Set<string>>();

  getHello(): string {
    return 'SWEPack API';
  }

  listResources(query = '', category = '', visitorId = '') {
    const term = query.trim().toLowerCase();
    const saved = this.savedByVisitor.get(visitorId) ?? new Set<string>();
    return this.resources
      .filter((resource) => !category || resource.category === category)
      .filter(
        (resource) =>
          !term ||
          `${resource.name} ${resource.description} ${resource.category}`
            .toLowerCase()
            .includes(term),
      )
      .map((resource) => ({ ...resource, saved: saved.has(resource.id) }));
  }

  submitResource(submission: ResourceSubmission) {
    const id =
      submission.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `resource-${Date.now()}`;
    this.resources.push({
      id,
      name: submission.name,
      category: submission.category,
      sub: submission.subcategory,
      letter: submission.name.charAt(0).toUpperCase(),
      color: 'blue',
      description: submission.description,
      url: submission.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      type: submission.tags.split(',')[0]?.trim() || 'Resource',
      saves: '0 saves',
    });
    return { id, status: 'pending_review' };
  }

  toggleSaved(id: string, visitorId: string) {
    let saved = this.savedByVisitor.get(visitorId);
    if (!saved) {
      saved = new Set<string>();
      this.savedByVisitor.set(visitorId, saved);
    }
    const isSaved = saved.has(id);
    if (isSaved) saved.delete(id);
    else saved.add(id);
    return { id, saved: !isSaved };
  }
}
