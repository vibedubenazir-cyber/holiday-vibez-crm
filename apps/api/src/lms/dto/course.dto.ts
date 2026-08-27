import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateChapterDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateChapterDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateLessonDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  // Which chapter the lesson belongs to. Omit to fall into the course's first
  // chapter (or a freshly-created "Chapter 1" if the course has none yet).
  @IsOptional()
  @IsString()
  chapterId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateSelfAssessmentQuestionDto {
  @IsString()
  text!: string;

  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  correctIndex!: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateQuizQuestionDto {
  @IsString()
  text!: string;

  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  correctIndex!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class QuizAnswerDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(0)
  selectedIndex!: number;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}

// Same answer shape as the graded quiz, but this is the ungraded practice
// self-assessment — nothing is persisted, feedback is returned immediately.
export class CheckSelfAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
