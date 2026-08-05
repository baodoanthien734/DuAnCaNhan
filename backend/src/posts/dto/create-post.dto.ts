import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreatePostDto {
	@IsString({ message: i18nValidationMessage('posts.validation.title_required') })
	@IsNotEmpty({ message: i18nValidationMessage('posts.validation.title_required') })
	title!: string;

	@IsOptional()
	@IsString({ message: i18nValidationMessage('posts.validation.summary_string') })
	summary?: string;

	@IsString({ message: i18nValidationMessage('posts.validation.content_required') })
	@IsNotEmpty({ message: i18nValidationMessage('posts.validation.content_required') })
	content!: string;

	@Transform(({ value }) => {
		if (typeof value === 'boolean') {
			return value;
		}

		if (value === 'true') {
			return true;
		}

		if (value === 'false') {
			return false;
		}

		return value;
	})
	@IsBoolean({ message: i18nValidationMessage('posts.validation.is_published_boolean') })
	isPublished!: boolean;
}
