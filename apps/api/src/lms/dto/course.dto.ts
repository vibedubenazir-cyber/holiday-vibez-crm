import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

export class CreateLessonDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

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

export class SubmitQuizDto {
  @IsArray()
  answers!: { questionId: string; selectedIndex: number }[];
}
