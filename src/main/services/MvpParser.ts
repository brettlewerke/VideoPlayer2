/**
 * MAGIX MVP (Movie Video Project) File Parser
 * Extracts video file references from MAGIX Movie Studio and Video Pro X project files
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface MvpVideoReference {
  /** Absolute path to the referenced video file */
  path: string;
  /** Original filename */
  filename: string;
  /** File extension (e.g., '.mvd', '.mp4') */
  extension: string;
  /** Whether the file exists on disk */
  exists: boolean;
  /** Relative path as stored in MVP file (if available) */
  relativePath?: string;
}

export interface MvpProjectInfo {
  /** MVP project file path */
  projectPath: string;
  /** Project name */
  projectName: string;
  /** All video file references found in the project */
  videoReferences: MvpVideoReference[];
  /** Project creation date (if available) */
  createdAt?: Date;
  /** Project last modified date */
  modifiedAt?: Date;
}

/**
 * Parse a MAGIX MVP file and extract video file references
 */
export class MvpParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: false,
      trimValues: true,
    });
  }

  /**
   * Parse an MVP file and return project information with video references
   */
  async parseFile(mvpFilePath: string): Promise<MvpProjectInfo> {
    if (!existsSync(mvpFilePath)) {
      throw new Error(`MVP file not found: ${mvpFilePath}`);
    }

    const projectDir = dirname(mvpFilePath);
    const projectName = this.extractProjectName(mvpFilePath);

    try {
      // Read file content
      const content = readFileSync(mvpFilePath, 'utf-8');
      
      // MVP files are typically XML-based, but may have binary headers
      // Try to parse as XML first
      let videoReferences: MvpVideoReference[] = [];

      if (content.includes('<?xml') || content.includes('<')) {
        // Parse as XML
        videoReferences = await this.parseXmlContent(content, projectDir);
      } else {
        // Try binary parsing (MVP files may have binary format)
        videoReferences = await this.parseBinaryContent(content, projectDir);
      }

      // Get file stats
      const stats = require('fs').statSync(mvpFilePath);

      return {
        projectPath: mvpFilePath,
        projectName,
        videoReferences,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      console.error(`[MvpParser] Failed to parse ${mvpFilePath}:`, error);
      throw new Error(`Failed to parse MVP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse XML-formatted MVP content
   */
  private async parseXmlContent(content: string, projectDir: string): Promise<MvpVideoReference[]> {
    const references: MvpVideoReference[] = [];

    try {
      // Extract XML portion if there's a binary header
      const xmlStart = content.indexOf('<?xml');
      const xmlContent = xmlStart >= 0 ? content.substring(xmlStart) : content;

      const parsed = this.xmlParser.parse(xmlContent);
      
      // Look for common XML patterns that reference video files
      this.extractReferencesFromObject(parsed, projectDir, references);
    } catch (error) {
      console.warn('[MvpParser] XML parsing failed:', error);
    }

    return references;
  }

  /**
   * Recursively search parsed XML object for file references
   */
  private extractReferencesFromObject(obj: any, projectDir: string, references: MvpVideoReference[]): void {
    if (!obj || typeof obj !== 'object') return;

    // Common XML attribute/tag names that might contain file paths
    const pathKeys = [
      'file', 'path', 'src', 'source', 'filename', 'filepath',
      'videofile', 'mediafile', 'clip', 'media', 'url', '#text'
    ];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if this key might contain a file path
      if (pathKeys.some(pk => lowerKey.includes(pk))) {
        if (typeof value === 'string' && this.looksLikeFilePath(value)) {
          this.addReference(value, projectDir, references);
        }
      }

      // Check attribute values (fast-xml-parser uses @_ prefix)
      if (key.startsWith('@_') && typeof value === 'string' && this.looksLikeFilePath(value)) {
        this.addReference(value, projectDir, references);
      }

      // Recurse into nested objects/arrays
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(item => this.extractReferencesFromObject(item, projectDir, references));
        } else {
          this.extractReferencesFromObject(value, projectDir, references);
        }
      }
    }
  }

  /**
   * Parse binary-formatted MVP content
   */
  private async parseBinaryContent(content: string, projectDir: string): Promise<MvpVideoReference[]> {
    const references: MvpVideoReference[] = [];

    // Look for file path patterns in binary content
    // Video file extensions to search for
    const videoExtensions = ['.mvd', '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.mpg', '.mpeg'];
    
    // Search for potential file paths (null-terminated strings in binary)
    const pathPattern = /([A-Za-z]:\\[^<>:"|?*\x00-\x1F]+\.(mvd|mp4|avi|mkv|mov|wmv|mpg|mpeg|m4v|flv|webm))/gi;
    const matches = content.match(pathPattern);

    if (matches) {
      for (const match of matches) {
        this.addReference(match, projectDir, references);
      }
    }

    // Also look for relative paths (common in project files)
    const relativePattern = /(?:\.{1,2}[/\\])?[^<>:"|?*\x00-\x1F]+\.(mvd|mp4|avi|mkv|mov|wmv|mpg|mpeg|m4v|flv|webm)/gi;
    const relativeMatches = content.match(relativePattern);

    if (relativeMatches) {
      for (const match of relativeMatches) {
        if (!match.includes('\\') && !match.includes('/')) {
          // Simple filename, assume same directory as project
          this.addReference(match, projectDir, references);
        } else if (match.startsWith('.') || !match.includes(':')) {
          // Relative path
          this.addReference(match, projectDir, references);
        }
      }
    }

    return references;
  }

  /**
   * Check if a string looks like a file path
   */
  private looksLikeFilePath(str: string): boolean {
    if (!str || str.length < 3) return false;
    
    // Check for file extensions
    const hasExtension = /\.[a-z0-9]{2,4}$/i.test(str);
    
    // Check for path separators or drive letters
    const hasPathChars = str.includes('\\') || str.includes('/') || /^[A-Za-z]:/.test(str);
    
    return hasExtension && (hasPathChars || str.length > 4);
  }

  /**
   * Add a video file reference, resolving paths and checking existence
   */
  private addReference(pathStr: string, projectDir: string, references: MvpVideoReference[]): void {
    try {
      let absolutePath: string;

      // Clean up the path string
      pathStr = pathStr.trim().replace(/\0/g, '');

      // Resolve to absolute path
      if (/^[A-Za-z]:/.test(pathStr)) {
        // Already absolute (Windows)
        absolutePath = pathStr;
      } else if (pathStr.startsWith('/')) {
        // Absolute Unix path (less common on Windows)
        absolutePath = pathStr;
      } else {
        // Relative path - resolve against project directory
        absolutePath = resolve(projectDir, pathStr);
      }

      // Normalize path
      absolutePath = absolutePath.replace(/\\/g, '/').replace(/\/+/g, '/');

      // Check if already added
      if (references.some(ref => ref.path === absolutePath)) {
        return;
      }

      const filename = absolutePath.split('/').pop() || '';
      const extension = filename.includes('.') ? '.' + filename.split('.').pop() : '';

      references.push({
        path: absolutePath,
        filename,
        extension: extension.toLowerCase(),
        exists: existsSync(absolutePath),
        relativePath: pathStr,
      });

      console.log(`[MvpParser] Found video reference: ${absolutePath} (exists: ${existsSync(absolutePath)})`);
    } catch (error) {
      console.warn(`[MvpParser] Failed to process path "${pathStr}":`, error);
    }
  }

  /**
   * Extract project name from MVP file path
   */
  private extractProjectName(mvpFilePath: string): string {
    const filename = mvpFilePath.split(/[/\\]/).pop() || 'Unknown Project';
    return filename.replace(/\.mvp$/i, '');
  }

  /**
   * Get all video references that exist on disk
   */
  static getExistingReferences(projectInfo: MvpProjectInfo): MvpVideoReference[] {
    return projectInfo.videoReferences.filter(ref => ref.exists);
  }

  /**
   * Get the primary video file from references (largest file)
   */
  static getPrimaryVideo(projectInfo: MvpProjectInfo): MvpVideoReference | null {
    const existing = this.getExistingReferences(projectInfo);
    
    if (existing.length === 0) return null;
    if (existing.length === 1) return existing[0];

    // Find the largest file
    const fs = require('fs');
    let largestRef: MvpVideoReference | null = null;
    let largestSize = 0;

    for (const ref of existing) {
      try {
        const stats = fs.statSync(ref.path);
        if (stats.size > largestSize) {
          largestSize = stats.size;
          largestRef = ref;
        }
      } catch (error) {
        console.warn(`[MvpParser] Failed to stat file ${ref.path}:`, error);
      }
    }

    return largestRef || existing[0];
  }
}

// Export singleton instance
export const mvpParser = new MvpParser();
