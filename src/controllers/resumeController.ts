import { NextFunction, Request, Response } from "express";
import { Filter, ObjectId } from "mongodb";
import { DatabaseError, resumeRepository } from "../repositories/ResumeRepository";
import { ResumeDocument } from "../repositories/ResumeingestionRepository";
import { EmbeddingError } from "../services/EmbeddingService";
import {
  canonicalSkill,
  locationMatch,
  parseSearchInput,
  RequestValidationError,
  resumeSearchService,
  SearchIndexNotReadyError,
} from "../services/ResumeSearchService";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

class NotFoundError extends Error {
  constructor() {
    super("Resume not found");
  }
}

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof RequestValidationError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ success: false, message: err.message });
  }
  if (err instanceof SearchIndexNotReadyError) {
    return res.status(503).json({ success: false, message: err.message });
  }
  if (err instanceof EmbeddingError) {
    console.error(err.message, err.cause ?? "");
    return res.status(502).json({ success: false, message: err.message });
  }
  if (err instanceof DatabaseError) {
    console.error(err.message, err.cause ?? "");
    return res.status(500).json({ success: false, message: err.message });
  }
  return next(err);
};

const parseId = (value: unknown): ObjectId => {
  if (typeof value !== "string" || !ObjectId.isValid(value) || value.length !== 24) {
    throw new RequestValidationError("Invalid resume id");
  }
  return new ObjectId(value);
};

// Reads an optional single-valued query string parameter.
const queryParam = (req: Request, name: string): string | undefined => {
  const value = req.query[name];
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new RequestValidationError(`${name} must be a single value`);
  return value.trim();
};

const positiveInt = (value: string | undefined, name: string, fallback: number, max = Infinity): number => {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new RequestValidationError(`${name} must be an integer${max === Infinity ? " of at least 1" : ` between 1 and ${max}`}`);
  }
  return n;
};

const toResponse = ({ _id, ...rest }: { _id: ObjectId } & Record<string, unknown>) => ({ id: _id.toHexString(), ...rest });

// Phase 15. Body: { query, limit?, filters?: { skills, minExperience, maxExperience, location } }
export const searchResumes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseSearchInput(req.body);
    const { mode, results } = await resumeSearchService.search(input);
    return res.status(200).json({
      success: true,
      message: "Search completed",
      data: { query: input.query, mode, count: results.length, results },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Phase 16. Query: page, limit, skill, location
export const listResumes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = positiveInt(queryParam(req, "page"), "page", 1);
    const limit = positiveInt(queryParam(req, "limit"), "limit", DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skill = queryParam(req, "skill");
    const location = queryParam(req, "location");

    const filter: Filter<ResumeDocument> = {
      ...(skill && { skills: canonicalSkill(skill) }),
      ...(location && { location: locationMatch(location) }),
    };
    const { items, total } = await resumeRepository.list(filter, (page - 1) * limit, limit);

    return res.status(200).json({
      success: true,
      message: "Resumes fetched",
      data: { page, limit, total, items: items.map(toResponse) },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

export const getResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resume = await resumeRepository.findById(parseId(req.params.id));
    if (!resume) throw new NotFoundError();
    return res.status(200).json({ success: true, message: "Resume fetched", data: toResponse(resume as typeof resume & { _id: ObjectId }) });
  } catch (err) {
    return handleError(err, res, next);
  }
};

export const deleteResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const { deleted, fileRecordsRemoved } = await resumeRepository.deleteById(id);
    if (!deleted) throw new NotFoundError();
    return res.status(200).json({
      success: true,
      message: "Resume deleted",
      data: { id: id.toHexString(), fileRecordsRemoved },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};
