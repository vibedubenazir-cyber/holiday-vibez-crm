import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LmsService } from './lms.service';
import {
  CheckSelfAssessmentDto,
  CreateChapterDto,
  CreateCourseDto,
  CreateLessonDto,
  CreateQuizQuestionDto,
  CreateSelfAssessmentQuestionDto,
  SubmitQuizDto,
  UpdateChapterDto,
  UpdateCourseDto,
} from './dto/course.dto';
import { CreateAssignmentDto } from './dto/assignment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGER_ROLES: Role[] = [Role.DIRECTOR, Role.ADMIN];
// Branch Managers may assign training within their own branch (see Targets
// module precedent) even though they can't author course content.
const ASSIGNER_ROLES: Role[] = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lms')
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  @Roles(...ALL_ROLES)
  @Get('courses')
  listCourses(@CurrentUser() user: AuthUser, @Query('all') all?: string) {
    const isManager = MANAGER_ROLES.includes(user.role);
    return this.lmsService.listCourses(isManager && all === '1');
  }

  @Roles(...MANAGER_ROLES)
  @Post('courses')
  createCourse(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.lmsService.createCourse(dto, user.id);
  }

  @Roles(...MANAGER_ROLES)
  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.lmsService.updateCourse(id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('courses/:id')
  getCourse(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.lmsService.getCourseDetail(id, user.id, MANAGER_ROLES.includes(user.role));
  }

  @Roles(...MANAGER_ROLES)
  @Post('courses/:id/lessons')
  addLesson(@Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.lmsService.addLesson(id, dto);
  }

  @Roles(...MANAGER_ROLES)
  @Post('courses/:id/quiz-questions')
  addQuizQuestion(@Param('id') id: string, @Body() dto: CreateQuizQuestionDto) {
    return this.lmsService.addQuizQuestion(id, dto);
  }

  // --- chapters (manager authoring) ---
  @Roles(...MANAGER_ROLES)
  @Post('courses/:id/chapters')
  addChapter(@Param('id') id: string, @Body() dto: CreateChapterDto) {
    return this.lmsService.addChapter(id, dto);
  }

  @Roles(...MANAGER_ROLES)
  @Patch('chapters/:chapterId')
  updateChapter(@Param('chapterId') chapterId: string, @Body() dto: UpdateChapterDto) {
    return this.lmsService.updateChapter(chapterId, dto);
  }

  @Roles(...MANAGER_ROLES)
  @Delete('chapters/:chapterId')
  deleteChapter(@Param('chapterId') chapterId: string) {
    return this.lmsService.deleteChapter(chapterId);
  }

  // --- self-assessment (ungraded practice) ---
  @Roles(...MANAGER_ROLES)
  @Post('chapters/:chapterId/self-assessment')
  addSelfAssessmentQuestion(@Param('chapterId') chapterId: string, @Body() dto: CreateSelfAssessmentQuestionDto) {
    return this.lmsService.addSelfAssessmentQuestion(chapterId, dto);
  }

  @Roles(...MANAGER_ROLES)
  @Delete('self-assessment/:questionId')
  deleteSelfAssessmentQuestion(@Param('questionId') questionId: string) {
    return this.lmsService.deleteSelfAssessmentQuestion(questionId);
  }

  @Roles(...ALL_ROLES)
  @Post('courses/:id/chapters/:chapterId/self-assessment/check')
  checkSelfAssessment(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CheckSelfAssessmentDto,
  ) {
    return this.lmsService.checkSelfAssessment(id, chapterId, user.id, dto);
  }

  @Roles(...ALL_ROLES)
  @Post('courses/:id/enroll')
  enroll(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.lmsService.enroll(id, user.id);
  }

  @Roles(...ALL_ROLES)
  @Post('courses/:id/lessons/:lessonId/complete')
  markLessonComplete(@Param('id') id: string, @Param('lessonId') lessonId: string, @CurrentUser() user: AuthUser) {
    return this.lmsService.markLessonComplete(id, lessonId, user.id);
  }

  @Roles(...ALL_ROLES)
  @Post('courses/:id/quiz/submit')
  submitQuiz(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: SubmitQuizDto) {
    return this.lmsService.submitQuiz(id, user.id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('me/learning')
  myLearning(@CurrentUser() user: AuthUser) {
    return this.lmsService.myLearning(user.id);
  }

  @Roles(...ALL_ROLES)
  @Get('me/certificates')
  myCertificates(@CurrentUser() user: AuthUser) {
    return this.lmsService.myCertificates(user.id);
  }

  @Roles(...ASSIGNER_ROLES)
  @Post('assignments')
  createAssignment(@CurrentUser() user: AuthUser, @Body() dto: CreateAssignmentDto) {
    return this.lmsService.createAssignment(dto, user.id, user);
  }

  @Roles(...ASSIGNER_ROLES)
  @Get('assignments')
  listAssignments(@CurrentUser() user: AuthUser) {
    return this.lmsService.listAssignments(user);
  }

  @Roles(...ASSIGNER_ROLES)
  @Get('reports/completion')
  completionReport(@CurrentUser() user: AuthUser, @Query('courseId') courseId?: string, @Query('branchId') branchId?: string) {
    return this.lmsService.completionReport(user, { courseId, branchId });
  }
}
