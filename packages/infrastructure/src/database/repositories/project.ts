import { v4 as uuidv4 } from "uuid";
import { Project } from "../../types";
import { SQL_QUERIES } from "../sql";
import { BaseRepository } from "./base";

export class ProjectRepository extends BaseRepository {
  /**
   * Create a new project
   */
  async create(data: Omit<Project, "id" | "created_at" | "updated_at">): Promise<Project> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.CREATE_PROJECT,
      [data.name, data.repository_url, data.repository_id, JSON.stringify(data.configuration || {})]
    );
    
    return this.parseRow<Project>(result);
  }

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_PROJECT_BY_ID,
      [id]
    );
    
    return result ? this.parseRow<Project>(result) : null;
  }

  /**
   * Get project by repository ID
   */
  async getByRepositoryId(repositoryId: string): Promise<Project | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_PROJECT_BY_REPOSITORY_ID,
      [repositoryId]
    );
    
    return result ? this.parseRow<Project>(result) : null;
  }

  /**
   * Update project
   */
  async update(id: string, data: Partial<Omit<Project, "id" | "created_at" | "updated_at">>): Promise<Project | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated = {
      name: data.name ?? existing.name,
      repository_url: data.repository_url ?? existing.repository_url,
      configuration: data.configuration ?? existing.configuration,
    };

    const result = await this.executeQuerySingle(
      SQL_QUERIES.UPDATE_PROJECT,
      [id, updated.name, updated.repository_url, JSON.stringify(updated.configuration)]
    );
    
    return result ? this.parseRow<Project>(result) : null;
  }

  /**
   * Delete project
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.executeQuery(
      SQL_QUERIES.DELETE_PROJECT,
      [id]
    );
    
    return result.length > 0;
  }

  /**
   * List all projects
   */
  async list(): Promise<Project[]> {
    const results = await this.executeQuery(
      "SELECT * FROM projects ORDER BY created_at DESC"
    );
    
    return this.parseRows<Project>(results);
  }

  /**
   * Check if project exists by repository ID
   */
  async existsByRepositoryId(repositoryId: string): Promise<boolean> {
    const result = await this.executeQuerySingle(
      "SELECT id FROM projects WHERE repository_id = $1",
      [repositoryId]
    );
    
    return result !== null;
  }
}

