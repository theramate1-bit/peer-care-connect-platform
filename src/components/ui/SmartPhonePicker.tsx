import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, ChevronDown, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  format?: string;
}

interface SmartPhonePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  id?: string;
}

// Common countries with their phone formats
const COUNTRIES: Country[] = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', format: '#### ######' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', format: '(###) ###-####' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', format: '(###) ###-####' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', format: '#### ### ###' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dialCode: '+64', format: '### ### ####' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dialCode: '+353', format: '## ### ####' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49', format: '### ########' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33', format: '# ## ## ## ##' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34', format: '### ## ## ##' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39', format: '### ### ####' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31', format: '# #### ####' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dialCode: '+32', format: '### ## ## ##' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dialCode: '+41', format: '## ### ## ##' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', dialCode: '+43', format: '### ########' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dialCode: '+46', format: '## ### ## ##' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dialCode: '+47', format: '### ## ###' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dialCode: '+45', format: '## ## ## ##' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', dialCode: '+358', format: '## ### ####' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', dialCode: '+48', format: '### ### ###' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dialCode: '+420', format: '### ### ###' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', dialCode: '+36', format: '## ### ####' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', dialCode: '+40', format: '### ### ###' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', dialCode: '+359', format: '### ### ###' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', dialCode: '+385', format: '## ### ####' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', dialCode: '+386', format: '## ### ###' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', dialCode: '+421', format: '### ### ###' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', dialCode: '+370', format: '### #####' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', dialCode: '+371', format: '#### ####' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', dialCode: '+372', format: '#### ####' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351', format: '### ### ###' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', dialCode: '+30', format: '### ### ####' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', dialCode: '+357', format: '## ### ###' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', dialCode: '+356', format: '#### ####' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352', format: '## ## ## ##' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', dialCode: '+354', format: '### ####' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', dialCode: '+423', format: '### ### ###' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', dialCode: '+377', format: '## ## ## ##' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', dialCode: '+378', format: '## ## ## ##' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦', dialCode: '+379', format: '## ## ## ##' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', dialCode: '+376', format: '### ###' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81', format: '##-####-####' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', dialCode: '+82', format: '##-####-####' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dialCode: '+86', format: '### #### ####' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', format: '##### #####' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', format: '#### ####' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dialCode: '+852', format: '#### ####' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dialCode: '+886', format: '## #### ####' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', dialCode: '+66', format: '## ### ####' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60', format: '##-### ####' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62', format: '###-###-####' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63', format: '### ### ####' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dialCode: '+84', format: '### ### ####' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55', format: '(##) #####-####' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54', format: '### ###-####' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56', format: '## #### ####' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57', format: '### ### ####' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52', format: '## #### ####' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', dialCode: '+51', format: '### ### ###' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58', format: '###-###-####' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27', format: '## ### ####' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20', format: '## #### ####' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234', format: '### ### ####' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254', format: '### ### ###' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233', format: '## ### ####' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dialCode: '+212', format: '## #### ####' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', dialCode: '+216', format: '## ### ###' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', dialCode: '+213', format: '## ### ####' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', dialCode: '+218', format: '## ### ####' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', dialCode: '+249', format: '## ### ####' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dialCode: '+251', format: '## ### ####' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dialCode: '+256', format: '### ### ###' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dialCode: '+255', format: '## ### ####' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250', format: '### ### ###' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', dialCode: '+257', format: '## ## ####' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dialCode: '+253', format: '## ## ## ##' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', dialCode: '+252', format: '## ### ###' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', dialCode: '+291', format: '# ### ###' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', dialCode: '+211', format: '## ### ####' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', dialCode: '+236', format: '## ## ## ##' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩', dialCode: '+235', format: '## ## ## ##' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dialCode: '+237', format: '## ## ## ##' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241', format: '## ## ## ##' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dialCode: '+242', format: '## ### ####' },
  { code: 'CD', name: 'Democratic Republic of the Congo', flag: '🇨🇩', dialCode: '+243', format: '## ### ####' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', dialCode: '+244', format: '### ### ###' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', dialCode: '+260', format: '## ### ####' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dialCode: '+263', format: '## ### ####' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', dialCode: '+267', format: '## ### ###' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', dialCode: '+264', format: '## ### ####' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', dialCode: '+268', format: '## ## ####' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', dialCode: '+266', format: '## ### ###' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dialCode: '+261', format: '## ## #####' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', dialCode: '+230', format: '### ####' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dialCode: '+248', format: '# ### ###' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲', dialCode: '+269', format: '## ## ####' },
  { code: 'YT', name: 'Mayotte', flag: '🇾🇹', dialCode: '+262', format: '## ## ## ##' },
  { code: 'RE', name: 'Réunion', flag: '🇷🇪', dialCode: '+262', format: '## ## ## ##' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dialCode: '+258', format: '## ### ####' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', dialCode: '+265', format: '## ### ####' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dialCode: '+232', format: '## ### ###' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', dialCode: '+231', format: '## ### ####' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dialCode: '+225', format: '## ## ## ##' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', dialCode: '+224', format: '## ### ###' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', dialCode: '+245', format: '## ### ###' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', dialCode: '+220', format: '### ####' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', dialCode: '+221', format: '## ### ####' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223', format: '## ## ## ##' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226', format: '## ## ## ##' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227', format: '## ## ## ##' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷', dialCode: '+222', format: '## ## ## ##' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', dialCode: '+238', format: '### ####' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹', dialCode: '+239', format: '## #####' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', dialCode: '+240', format: '## ### ####' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228', format: '## ## ## ##' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', dialCode: '+229', format: '## ## ## ##' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', dialCode: '+7', format: '### ###-##-##' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', dialCode: '+375', format: '## ###-##-##' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dialCode: '+380', format: '## ### ## ##' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', dialCode: '+373', format: '### ## ###' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', dialCode: '+995', format: '### ### ###' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', dialCode: '+374', format: '## ### ###' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', dialCode: '+994', format: '## ### ## ##' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dialCode: '+7', format: '### ###-##-##' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', dialCode: '+998', format: '## ### ## ##' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', dialCode: '+993', format: '## ### ###' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', dialCode: '+992', format: '## ### ####' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', dialCode: '+996', format: '### ### ###' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', dialCode: '+976', format: '## ## ####' },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dialCode: '+93', format: '## ### ####' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92', format: '### ### ####' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880', format: '####-###-###' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94', format: '## ### ####' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', dialCode: '+960', format: '###-####' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', dialCode: '+975', format: '## ### ###' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977', format: '##-###-###' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', dialCode: '+95', format: '## ### ####' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', dialCode: '+856', format: '## ### ###' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', dialCode: '+855', format: '## ### ###' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', dialCode: '+673', format: '### ####' },
  { code: 'TL', name: 'East Timor', flag: '🇹🇱', dialCode: '+670', format: '### ####' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', dialCode: '+675', format: '### ####' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', dialCode: '+679', format: '### ####' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', dialCode: '+677', format: '### ####' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', dialCode: '+678', format: '### ####' },
  { code: 'NC', name: 'New Caledonia', flag: '🇳🇨', dialCode: '+687', format: '## ## ##' },
  { code: 'PF', name: 'French Polynesia', flag: '🇵🇫', dialCode: '+689', format: '## ## ##' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', dialCode: '+685', format: '### ####' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', dialCode: '+676', format: '### ####' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', dialCode: '+686', format: '### ####' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', dialCode: '+688', format: '### ####' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', dialCode: '+674', format: '### ####' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', dialCode: '+680', format: '### ####' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲', dialCode: '+691', format: '### ####' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', dialCode: '+692', format: '### ####' },
  { code: 'CK', name: 'Cook Islands', flag: '🇨🇰', dialCode: '+682', format: '### ####' },
  { code: 'NU', name: 'Niue', flag: '🇳🇺', dialCode: '+683', format: '### ####' },
  { code: 'TK', name: 'Tokelau', flag: '🇹🇰', dialCode: '+690', format: '### ####' },
  { code: 'AS', name: 'American Samoa', flag: '🇦🇸', dialCode: '+1', format: '(###) ###-####' },
  { code: 'GU', name: 'Guam', flag: '🇬🇺', dialCode: '+1', format: '(###) ###-####' },
  { code: 'MP', name: 'Northern Mariana Islands', flag: '🇲🇵', dialCode: '+1', format: '(###) ###-####' },
  { code: 'VI', name: 'U.S. Virgin Islands', flag: '🇻🇮', dialCode: '+1', format: '(###) ###-####' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', dialCode: '+1', format: '(###) ###-####' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', dialCode: '+1', format: '(###) ###-####' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', dialCode: '+509', format: '## ## ####' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', dialCode: '+1', format: '(###) ###-####' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', dialCode: '+1', format: '(###) ###-####' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', dialCode: '+1', format: '(###) ###-####' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', dialCode: '+1', format: '(###) ###-####' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', dialCode: '+1', format: '(###) ###-####' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', dialCode: '+1', format: '(###) ###-####' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', dialCode: '+1', format: '(###) ###-####' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', dialCode: '+1', format: '(###) ###-####' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', dialCode: '+1', format: '(###) ###-####' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', dialCode: '+501', format: '###-####' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dialCode: '+502', format: '#### ####' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dialCode: '+503', format: '#### ####' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', dialCode: '+504', format: '####-####' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dialCode: '+505', format: '#### ####' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506', format: '#### ####' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', dialCode: '+507', format: '####-####' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', dialCode: '+53', format: '## ### ####' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', dialCode: '+1', format: '(###) ###-####' },
  { code: 'TC', name: 'Turks and Caicos Islands', flag: '🇹🇨', dialCode: '+1', format: '(###) ###-####' },
  { code: 'KY', name: 'Cayman Islands', flag: '🇰🇾', dialCode: '+1', format: '(###) ###-####' },
  { code: 'BM', name: 'Bermuda', flag: '🇧🇲', dialCode: '+1', format: '(###) ###-####' },
  { code: 'GL', name: 'Greenland', flag: '🇬🇱', dialCode: '+299', format: '## ## ##' },
  { code: 'FO', name: 'Faroe Islands', flag: '🇫🇴', dialCode: '+298', format: '## ## ##' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen', flag: '🇸🇯', dialCode: '+47', format: '### ## ###' },
  { code: 'AX', name: 'Åland Islands', flag: '🇦🇽', dialCode: '+358', format: '## ### ####' },
  { code: 'GI', name: 'Gibraltar', flag: '🇬🇮', dialCode: '+350', format: '### #####' },
  { code: 'IM', name: 'Isle of Man', flag: '🇮🇲', dialCode: '+44', format: '#### ######' },
  { code: 'JE', name: 'Jersey', flag: '🇯🇪', dialCode: '+44', format: '#### ######' },
  { code: 'GG', name: 'Guernsey', flag: '🇬🇬', dialCode: '+44', format: '#### ######' },
  { code: 'FK', name: 'Falkland Islands', flag: '🇫🇰', dialCode: '+500', format: '#####' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands', flag: '🇬🇸', dialCode: '+500', format: '#####' },
  { code: 'SH', name: 'Saint Helena', flag: '🇸🇭', dialCode: '+290', format: '#####' },
  { code: 'AC', name: 'Ascension Island', flag: '🇦🇨', dialCode: '+247', format: '#####' },
  { code: 'TA', name: 'Tristan da Cunha', flag: '🇹🇦', dialCode: '+290', format: '#####' },
  { code: 'EH', name: 'Western Sahara', flag: '🇪🇭', dialCode: '+212', format: '## #### ####' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', dialCode: '+970', format: '## ### ####' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dialCode: '+972', format: '##-###-####' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dialCode: '+962', format: '## ### ####' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dialCode: '+961', format: '## ### ###' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', dialCode: '+963', format: '## ### ####' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dialCode: '+964', format: '## ### ####' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', dialCode: '+98', format: '### ### ####' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dialCode: '+90', format: '### ### ## ##' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', format: '## ### ####' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971', format: '## ### ####' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974', format: '## ### ####' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973', format: '#### ####' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965', format: '### ####' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968', format: '#### ####' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', dialCode: '+967', format: '## ### ####' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598', format: '### ### ###' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595', format: '## ### ####' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591', format: '### ### ###' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593', format: '## ### ####' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', dialCode: '+592', format: '### ####' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', dialCode: '+597', format: '### ####' },
  { code: 'GF', name: 'French Guiana', flag: '🇬🇫', dialCode: '+594', format: '## ## ## ##' },
  { code: 'FK', name: 'Falkland Islands', flag: '🇫🇰', dialCode: '+500', format: '#####' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands', flag: '🇬🇸', dialCode: '+500', format: '#####' },
  { code: 'SH', name: 'Saint Helena', flag: '🇸🇭', dialCode: '+290', format: '#####' },
  { code: 'AC', name: 'Ascension Island', flag: '🇦🇨', dialCode: '+247', format: '#####' },
  { code: 'TA', name: 'Tristan da Cunha', flag: '🇹🇦', dialCode: '+290', format: '#####' },
  { code: 'EH', name: 'Western Sahara', flag: '🇪🇭', dialCode: '+212', format: '## #### ####' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', dialCode: '+970', format: '## ### ####' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dialCode: '+972', format: '##-###-####' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dialCode: '+962', format: '## ### ####' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dialCode: '+961', format: '## ### ###' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', dialCode: '+963', format: '## ### ####' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dialCode: '+964', format: '## ### ####' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', dialCode: '+98', format: '### ### ####' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dialCode: '+90', format: '### ### ## ##' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', format: '## ### ####' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971', format: '## ### ####' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974', format: '## ### ####' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973', format: '#### ####' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965', format: '### ####' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968', format: '#### ####' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', dialCode: '+967', format: '## ### ####' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598', format: '### ### ###' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595', format: '## ### ####' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591', format: '### ### ###' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593', format: '## ### ####' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', dialCode: '+592', format: '### ####' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', dialCode: '+597', format: '### ####' },
  { code: 'GF', name: 'French Guiana', flag: '🇬🇫', dialCode: '+594', format: '## ## ## ##' }
];

export const SmartPhonePicker: React.FC<SmartPhonePickerProps> = ({
  value,
  onChange,
  placeholder = "Enter your phone number",
  className,
  error,
  id
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to UK
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      const parsed = parsePhoneNumber(value);
      if (parsed.country) {
        setSelectedCountry(parsed.country);
        setPhoneNumber(parsed.number);
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]); // Add value as dependency to handle prop changes

  // Update parent when phone number changes
  useEffect(() => {
    const fullNumber = phoneNumber ? `${selectedCountry.dialCode}${phoneNumber}` : '';
    onChange(fullNumber);
    validatePhoneNumber(phoneNumber);
  }, [phoneNumber, selectedCountry.dialCode]); // Remove onChange from dependencies

  const parsePhoneNumber = (fullNumber: string) => {
    for (const country of COUNTRIES) {
      if (fullNumber.startsWith(country.dialCode)) {
        return {
          country,
          number: fullNumber.substring(country.dialCode.length)
        };
      }
    }
    return { country: null, number: fullNumber };
  };

  const validatePhoneNumber = (number: string) => {
    // Basic validation - at least 7 digits
    const isValidNumber = /^\d{7,15}$/.test(number.replace(/\s/g, ''));
    setIsValid(isValidNumber);
    return isValidNumber;
  };

  const formatPhoneNumber = (number: string, format: string) => {
    const digits = number.replace(/\D/g, '');
    let formatted = '';
    let digitIndex = 0;

    for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
      if (format[i] === '#') {
        formatted += digits[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }

    return formatted;
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    inputRef.current?.focus();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setPhoneNumber(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowCountryDropdown(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="flex">
        {/* Country Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 border border-r-0 rounded-l-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {showCountryDropdown && (
            <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search countries..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowCountryDropdown(false);
                  }}
                />
              </div>
              {COUNTRIES.map((country) => (
                <div
                  key={country.code}
                  className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleCountrySelect(country)}
                >
                  <span className="text-lg">{country.flag}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{country.name}</div>
                    <div className="text-xs text-gray-500">{country.dialCode}</div>
                  </div>
                  {selectedCountry.code === country.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            id={id}
            type="tel"
            placeholder={placeholder}
            value={phoneNumber ? formatPhoneNumber(phoneNumber, selectedCountry.format || '#### ######') : ''}
            onChange={handlePhoneChange}
            onKeyDown={handleKeyDown}
            className={cn(
              "pl-10 pr-10 rounded-l-none",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500",
              className
            )}
          />
          {isValid && phoneNumber && (
            <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      
      {phoneNumber && !isValid && (
        <p className="text-sm text-amber-600 mt-1">
          Please enter a valid phone number (7-15 digits)
        </p>
      )}
    </div>
  );
};

export default SmartPhonePicker;
