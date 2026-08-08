// Upload de imagens (fotos de produtos, logo da empresa) via Cloudinary,
// usando unsigned upload preset — mesmo padrão do Fintrack.
//
// Configure VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env
// (pode reaproveitar o cloud name do Fintrack, mas crie um preset novo,
// ex. "nexo_erp", para manter os uploads organizados por produto).

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImage(file, folder = 'produtos') {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Falha no upload da imagem: ${err}`);
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
