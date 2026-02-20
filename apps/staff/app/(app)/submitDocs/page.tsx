// apps/staff/app/(app)/submitDocument/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";

interface StaffInfo {
  id: string;
  name: string;
  sales_name: string | null;
  rank: string;
  hq: string;
  team: string;
  site_id: string;
  site_name: string;
}

interface FileUpload {
  file: File | null;
  preview: string | null;
}

interface Bank {
  code: string;
  name: string;
}

interface DaumPostcodeData {
  zonecode: string;
  address: string;
}

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

export default function SubmitDocumentPage() {
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isTaxInvoice, setIsTaxInvoice] = useState(false);
  const [isCombinedIdBank, setIsCombinedIdBank] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    residentNumber: '',
    zipCode: '',
    addressMain: '',
    addressDetail: '',
    bank: '',
    accountHolder: '',
    accountNumber: '',
    // 세금계산서용
    companyName: '',
    businessNumber: '',
    taxBank: '',
    taxAccountHolder: '',
    taxAccountNumber: '',
  });

  const [documents, setDocuments] = useState({
    registration: { file: null, preview: null } as FileUpload,
    idCard: { file: null, preview: null } as FileUpload,
    bankbook: { file: null, preview: null } as FileUpload,
  });

  useEffect(() => {
    const loadData = async () => {
      const supabase = supabaseAppClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const [staffResult, banksResult] = await Promise.all([
        supabase.from('users_staff').select('id, name, sales_name, rank, hq, team, site_id').eq('kakao_id', user.id).single(),
        supabase.from('banks').select('code, name').order('name'),
      ]);

      if (banksResult.data && !banksResult.error) {
        setBanks(banksResult.data);
      }

      if (staffResult.data && staffResult.data.site_id) {
        const staff = staffResult.data;
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', staff.site_id)
          .single();

        setStaffInfo({
          id: staff.id,
          name: staff.name || '',
          sales_name: staff.sales_name || null,
          rank: staff.rank || '',
          hq: staff.hq || '',
          team: staff.team || '',
          site_id: staff.site_id,
          site_name: site?.name || '',
        });

        setFormData(prev => ({
          ...prev,
          accountHolder: staff.name || '',
          name: staff.name || ''
        }));
      }
    };

    loadData();
  }, []);

  // ─── 이미지 압축 (최대 1280px, quality 0.7) ───
  const compressImage = (file: File, maxWidth = 1280, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') {
        resolve(file);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  // ─── 파일명 규칙: {현장명}_{본부}_{팀}_{이름}_{서류종류}.{ext} ───
  const DOC_TYPE_LABEL: Record<string, string> = {
    registration: '등본',
    idCard: '신분증',
    idCardCombined: '신분증 및 통장사본',
    bankbook: '통장사본',
  };

  const buildFileName = (docType: string, ext: string) => {
    const parts: string[] = [];

    parts.push(staffInfo?.site_name || '미지정');
    if (staffInfo?.hq) parts.push(staffInfo.hq);
    if (staffInfo?.team) parts.push(staffInfo.team);
    parts.push(staffInfo?.sales_name || staffInfo?.name || '미입력');
    parts.push(DOC_TYPE_LABEL[docType] || docType);

    // 타임스탬프 추가 (중복 파일명 방지)
    const timestamp = Date.now();
    return `${parts.join('_')}_${timestamp}.${ext}`;
  };

  // ─── 포맷 함수들 ───
  const formatResidentNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 6) return numbers;
    return `${numbers.slice(0, 6)}-${numbers.slice(6, 13)}`;
  };

  const formatBusinessNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        setFormData(prev => ({
          ...prev,
          zipCode: data.zonecode,
          addressMain: data.address,
        }));
      }
    }).open();
  };

  // ─── 파일 선택 (선택 시점에 압축) ───
  const handleFileSelect = (type: 'camera' | 'upload', docType: keyof typeof documents) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    if (type === 'camera') {
      input.setAttribute('capture', 'environment');
    }
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const compressed = await compressImage(file);
        const preview = URL.createObjectURL(compressed);
        setDocuments(prev => ({
          ...prev,
          [docType]: { file: compressed, preview }
        }));
      }
    };
    
    input.click();
  };

  // ─── 제출 ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.residentNumber || !formData.addressMain || !formData.addressDetail) {
      alert('기본 정보를 모두 입력해주세요.');
      return;
    }

    if (!formData.bank || !formData.accountHolder || !formData.accountNumber) {
      alert('계좌 정보를 모두 입력해주세요.');
      return;
    }

    if (isTaxInvoice) {
      if (!formData.companyName || !formData.businessNumber || !formData.taxBank || !formData.taxAccountHolder || !formData.taxAccountNumber) {
        alert('세금계산서 정보를 모두 입력해주세요.');
        return;
      }
    }

    if (!documents.registration.file || !documents.idCard.file) {
      alert('주민등록표등본과 신분증을 첨부해주세요.');
      return;
    }

    if (!isCombinedIdBank && !documents.bankbook.file) {
      alert('통장 사본을 첨부해주세요.');
      return;
    }

    if (!staffInfo?.id || !staffInfo?.site_id) {
      alert('사용자 정보를 불러올 수 없습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = supabaseAppClient();
      const siteName = (staffInfo.site_name || '미지정').replace(/\s+/g, '_');
      const uploadedPaths: Record<string, string> = {};

      // ── 파일 업로드 ──

      // 1) 등본
      if (documents.registration.file) {
        const ext = documents.registration.file.type === 'application/pdf' ? 'pdf' : 'jpg';
        const fileName = buildFileName('registration', ext);
        const storagePath = `${siteName}/${fileName}`;

        const { error } = await supabase.storage
          .from('staff_docs')
          .upload(storagePath, documents.registration.file, {
            contentType: documents.registration.file.type,
            upsert: false,
          });
        if (error) throw new Error(`등본 업로드 실패: ${error.message}`);
        uploadedPaths.registration = storagePath;
      }

      // 2) 신분증 (한 장 사진이면 파일명을 "신분증 및 통장사본"으로)
      if (documents.idCard.file) {
        const docTypeKey = isCombinedIdBank ? 'idCardCombined' : 'idCard';
        const ext = documents.idCard.file.type === 'application/pdf' ? 'pdf' : 'jpg';
        const fileName = buildFileName(docTypeKey, ext);
        const storagePath = `${siteName}/${fileName}`;

        const { error } = await supabase.storage
          .from('staff_docs')
          .upload(storagePath, documents.idCard.file, {
            contentType: documents.idCard.file.type,
            upsert: false,
          });
        if (error) throw new Error(`신분증 업로드 실패: ${error.message}`);
        uploadedPaths.idCard = storagePath;
      }

      // 3) 통장사본 (한 장 사진이 아닐 때만)
      if (!isCombinedIdBank && documents.bankbook.file) {
        const ext = documents.bankbook.file.type === 'application/pdf' ? 'pdf' : 'jpg';
        const fileName = buildFileName('bankbook', ext);
        const storagePath = `${siteName}/${fileName}`;

        const { error } = await supabase.storage
          .from('staff_docs')
          .upload(storagePath, documents.bankbook.file, {
            contentType: documents.bankbook.file.type,
            upsert: false,
          });
        if (error) throw new Error(`통장사본 업로드 실패: ${error.message}`);
        uploadedPaths.bankbook = storagePath;
      }

      // ── DB 저장 ──
      const address = [formData.zipCode, formData.addressMain, formData.addressDetail].filter(Boolean).join(' ');

      const idCardUrl = uploadedPaths.idCard || null;
      const bankAccountUrl = isCombinedIdBank
        ? uploadedPaths.idCard || null
        : uploadedPaths.bankbook || null;

      const { error: dbError } = await supabase
        .from('users_staff_docs')
        .insert({
          user_id: staffInfo.id,
          site_id: staffInfo.site_id,
          name: formData.name,
          resident_number: formData.residentNumber,
          address,
          bank_type: formData.bank,
          bank_name: formData.accountHolder,
          bank_number: formData.accountNumber,
          is_invoice: isTaxInvoice,
          invoice_bank_type: isTaxInvoice ? formData.taxBank : null,
          invoice_bank_name: isTaxInvoice ? formData.taxAccountHolder : null,
          invoice_bank_number: isTaxInvoice ? formData.taxAccountNumber : null,
          same_photo_check: isCombinedIdBank,
          resi_doc_url: uploadedPaths.registration || null,
          id_card_url: idCardUrl,
          bank_account_url: bankAccountUrl,
          submitted_at: new Date().toISOString(),
          status: 'submitted',
        });

      if (dbError) throw new Error(`저장 실패: ${dbError.message}`);

      alert('서류가 제출되었습니다.');
      // TODO: 완료 페이지 이동

    } catch (err) {
      const message = err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" 
        strategy="lazyOnload"
      />
      <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <div className={staffUi.layout.main}>
        <div className="max-w-md mx-auto space-y-3">
          {/* 등록현장/등록자 정보 */}
          <div className="bg-white rounded-xl p-4">
            {staffInfo ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                  <span className="text-blue-600">📍</span>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">등록현장</p>
                    <p className="text-sm font-bold text-gray-800">{staffInfo.site_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">👤</span>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">제출자</p>
                    <p className="text-sm font-bold text-gray-800">
                      {staffInfo.hq}본부 {staffInfo.team}팀 {staffInfo.name} {staffInfo.rank}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">정보를 불러오는 중...</p>
            )}
          </div>

          {/* 기본 정보 입력 */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
              <h2 className="text-base font-bold text-white">기본 정보</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* 성명 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  성명
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={staffUi.inputClass()}
                  placeholder="성명을 입력하세요"
                />
              </div>

              {/* 주민번호 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  주민등록번호
                </label>
                <input
                  type="text"
                  value={formData.residentNumber}
                  onChange={(e) => setFormData({ ...formData, residentNumber: formatResidentNumber(e.target.value) })}
                  className={staffUi.inputClass()}
                  placeholder="000000-0000000"
                  maxLength={14}
                />
              </div>

              {/* 주소 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  주소
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.zipCode}
                      readOnly
                      className={staffUi.inputClass() + ' flex-1'}
                      placeholder="우편번호"
                    />
                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                      주소검색
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.addressMain}
                    readOnly
                    className={staffUi.inputClass()}
                    placeholder="기본주소"
                  />
                  <input
                    type="text"
                    value={formData.addressDetail}
                    onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                    className={staffUi.inputClass()}
                    placeholder="상세주소를 입력하세요"
                  />
                </div>
              </div>

              {/* 은행 선택 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  은행
                </label>
                <select
                  value={formData.bank}
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  className={staffUi.inputClass()}
                >
                  <option value="">은행을 선택하세요</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.name}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 예금주 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  예금주
                </label>
                <input
                  type="text"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  className={staffUi.inputClass()}
                  placeholder="예금주를 입력하세요"
                />
              </div>

              {/* 계좌번호 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  계좌번호
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/[^\d-]/g, '') })}
                  className={staffUi.inputClass()}
                  placeholder="계좌번호를 입력하세요"
                />
              </div>

              {/* 급여구분 */}
              <div className="pt-2 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxInvoice}
                    onChange={(e) => setIsTaxInvoice(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">세금계산서로 신청할게요</span>
                </label>
              </div>
            </form>
          </div>

          {/* 세금계산서 정보 (조건부 표시) */}
          {isTaxInvoice && (
            <div className="bg-white rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
                <h2 className="text-base font-bold text-white">세금계산서 정보</h2>
              </div>
              
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">법인명</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className={staffUi.inputClass()}
                    placeholder="법인명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">사업자번호</label>
                  <input
                    type="text"
                    value={formData.businessNumber}
                    onChange={(e) => setFormData({ ...formData, businessNumber: formatBusinessNumber(e.target.value) })}
                    className={staffUi.inputClass()}
                    placeholder="000-00-00000"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">은행</label>
                  <select
                    value={formData.taxBank}
                    onChange={(e) => setFormData({ ...formData, taxBank: e.target.value })}
                    className={staffUi.inputClass()}
                  >
                    <option value="">은행을 선택하세요</option>
                    {banks.map((bank) => (
                      <option key={bank.code} value={bank.name}>{bank.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">예금주</label>
                  <input
                    type="text"
                    value={formData.taxAccountHolder}
                    onChange={(e) => setFormData({ ...formData, taxAccountHolder: e.target.value })}
                    className={staffUi.inputClass()}
                    placeholder="예금주를 입력하세요"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">계좌번호</label>
                  <input
                    type="text"
                    value={formData.taxAccountNumber}
                    onChange={(e) => setFormData({ ...formData, taxAccountNumber: e.target.value.replace(/[^\d-]/g, '') })}
                    className={staffUi.inputClass()}
                    placeholder="계좌번호를 입력하세요"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 서류 제출 */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
              <h2 className="text-base font-bold text-white">서류 제출</h2>
            </div>
            
            <div className="p-4">
            {/* 신분증+통장 체크박스 */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCombinedIdBank}
                  onChange={(e) => setIsCombinedIdBank(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">신분증과 통장이 한 장의 사진이에요</span>
              </label>
            </div>

            <div className="space-y-2">
              {/* 주민등록표등본 */}
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg h-12">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">주민등록표등본</p>
                </div>
                <div className="flex items-center gap-2">
                  {!documents.registration.file ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleFileSelect('camera', 'registration')}
                        className="p-1.5 text-gray-600 hover:text-blue-600"
                      >
                        📷
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFileSelect('upload', 'registration')}
                        className="p-1.5 text-gray-600 hover:text-blue-600"
                      >
                        📁
                      </button>
                    </>
                  ) : (
                    <span className="text-green-600 font-bold">✓</span>
                  )}
                </div>
              </div>

              {/* 신분증 (한 장이면 라벨 변경) */}
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg h-12">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {isCombinedIdBank ? '신분증 및 통장사본' : '신분증'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!documents.idCard.file ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleFileSelect('camera', 'idCard')}
                        className="p-1.5 text-gray-600 hover:text-blue-600"
                      >
                        📷
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFileSelect('upload', 'idCard')}
                        className="p-1.5 text-gray-600 hover:text-blue-600"
                      >
                        📁
                      </button>
                    </>
                  ) : (
                    <span className="text-green-600 font-bold">✓</span>
                  )}
                </div>
              </div>

              {/* 통장 사본 */}
              <div className={`flex items-center justify-between p-2.5 rounded-lg h-12 ${isCombinedIdBank ? 'bg-gray-200' : 'bg-gray-50'}`}>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isCombinedIdBank ? 'text-gray-400' : 'text-gray-800'}`}>
                    통장 사본
                  </p>
                </div>
                <div className="flex items-center gap-2 min-w-[64px]">
                  {!isCombinedIdBank && !documents.bankbook.file ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleFileSelect('camera', 'bankbook')}
                        className="p-1.5 text-gray-600 hover:text-blue-600"
                      >
                        📷
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFileSelect('upload', 'bankbook')}
                        className="p-1.5 text-gray-600 hover:text-blue-600"
                      >
                        📁
                      </button>
                    </>
                  ) : !isCombinedIdBank && documents.bankbook.file ? (
                    <span className="text-green-600 font-bold">✓</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="pt-4 border-t border-gray-200">
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={staffUi.buttonClass.primary}
              >
                {isSubmitting ? '제출 중...' : '제출하기'}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}