import { IsString, IsNotEmpty } from 'class-validator';

export class ReplyReviewDto {
  @IsString()
  @IsNotEmpty()
  adminReply!: string;
}