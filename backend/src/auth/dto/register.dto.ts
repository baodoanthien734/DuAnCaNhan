import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Mã OTP phải đủ 6 chữ số' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  name!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải chứa ít nhất 8 ký tự' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường và chữ số/ký tự đặc biệt',
  })
  password!: string;
}