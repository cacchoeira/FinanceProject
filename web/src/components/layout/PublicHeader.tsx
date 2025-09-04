import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function PublicHeader() {
  const { t } = useTranslation();

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow-sm">
      <div className="text-2xl font-bold text-primary-600">FinancePro</div>
      <nav className="space-x-4">
        <Link to="/login" className="px-4 py-2 text-primary-600 font-medium hover:text-primary-500">
          {t('auth.login')}
        </Link>
        <Link to="/signup" className="px-4 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700">
          {t('auth.signup')}
        </Link>
      </nav>
    </header>
  );
}