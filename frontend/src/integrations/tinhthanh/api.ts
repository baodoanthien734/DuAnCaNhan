// api 34tinhthanh.com
import axios from 'axios';

const BASE_URL = 'https://34tinhthanh.com/api';

// 1. Lấy danh sách 34 Tỉnh/Thành mới nhất
export const getProvinces = async () => {
  const res = await axios.get(`${BASE_URL}/provinces`);
  return res.data; // Trả về mảng [{ province_code, name }]
};

// 2. Lấy danh sách Phường/Xã trực thuộc Tỉnh/Thành đó (dùng province_code)
export const getWards = async (provinceCode: string) => {
  const res = await axios.get(`${BASE_URL}/wards`, {
    params: { province_code: provinceCode }
  });
  return res.data; // Trả về mảng [{ ward_code, ward_name, province_code }]
};