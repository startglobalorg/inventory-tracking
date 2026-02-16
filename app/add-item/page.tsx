'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createItem } from '@/app/actions';

const CATEGORIES = [
    'Energy Drinks',
    'Soft Drinks',
    'Juices',
    'Water',
    'Coffee & Tea',
    'Milk & Dairy',
    'Snacks - Salty',
    'Snacks - Sweet',
    'Snacks - Healthy',
    'Fresh Food',
    'Other',
];

const BRANDS = [
    'Red Bull',
    'Monster',
    'Coca-Cola',
    'Pepsi',
    'Fanta',
    'Sprite',
    'Rivella',
    'Dr Pepper',
    'Mountain Dew',
    'Nestea',
    'Lipton',
    'Evian',
    'Vittel',
    'San Pellegrino',
    'Nespresso',
    'Lavazza',
    'Twix',
    'Snickers',
    'Mars',
    'KitKat',
    'Milka',
    'Haribo',
    'Pringles',
    'Doritos',
    'Lays',
    'Clif Bar',
    'Nature Valley',
    'Perfect You',
    'YFood',
    'Isey',
];

export default function AddItemPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        size: '',
        stock: 0,
        minThreshold: 0,
        category: '',
        quantityPerUnit: 1,
        coldStorage: false,
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [showCustomBrand, setShowCustomBrand] = useState(false);
    const [brandSearch, setBrandSearch] = useState('');
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);

    // Auto-generate SKU
    const generatedSKU = useMemo(() => {
        if (!formData.category || !formData.name) return '';

        const categoryCode = formData.category.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6);
        // Use full name to ensure uniqueness (e.g., "Rivella Red" vs "Rivella Blue")
        const nameCode = formData.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 15);
        const sizeCode = formData.size ? formData.size.replace(/[^0-9]/g, '') : '';

        return sizeCode
            ? `${categoryCode}-${nameCode}-${sizeCode}`
            : `${categoryCode}-${nameCode}`;
    }, [formData.category, formData.name, formData.size]);

    // Filter brands based on search
    const filteredBrands = useMemo(() => {
        if (!brandSearch) return BRANDS;
        return BRANDS.filter(brand =>
            brand.toLowerCase().includes(brandSearch.toLowerCase())
        );
    }, [brandSearch]);

    // Determine if category is liquid (uses ml) or solid (uses g)
    const isLiquidCategory = useMemo(() => {
        const liquidCategories = [
            'Energy Drinks',
            'Soft Drinks',
            'Juices',
            'Water',
            'Coffee & Tea',
            'Milk & Dairy',
        ];
        return liquidCategories.includes(formData.category);
    }, [formData.category]);

    const sizeUnit = isLiquidCategory ? 'ml' : 'g';
    const sizeLabel = isLiquidCategory ? 'milliliters' : 'grams';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!generatedSKU) {
            setError('Please fill in category and name to generate SKU');
            return;
        }

        setIsSubmitting(true);

        const result = await createItem({
            ...formData,
            sku: generatedSKU,
            unitName: 'unit', // Default value since we removed the field
        });

        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || 'Failed to create item');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Inventory
                    </Link>
                    <h1 className="text-3xl font-black text-white">Add New Item</h1>
                    <p className="mt-2 text-slate-400">Add a new item to your inventory</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="rounded-lg bg-red-900/20 border border-red-500 p-4 text-red-200">
                            {error}
                        </div>
                    )}

                    <div className="bg-slate-900 rounded-xl p-6 space-y-4">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                                Item Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Rivella Red (500ml)"
                            />
                            <p className="mt-1 text-xs text-slate-500">Include variant/flavor for unique SKU (e.g., &quot;Red&quot; vs &quot;Blue&quot;)</p>
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-semibold text-white mb-2">
                                Category *
                            </label>
                            {showCustomCategory ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        id="category"
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter custom category"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCustomCategory(false);
                                            setFormData({ ...formData, category: '' });
                                        }}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        ← Back to predefined categories
                                    </button>
                                </div>
                            ) : (
                                <select
                                    id="category"
                                    required
                                    value={formData.category}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'custom') {
                                            setShowCustomCategory(true);
                                            setFormData({ ...formData, category: '' });
                                        } else {
                                            setFormData({ ...formData, category: value });
                                        }
                                    }}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select a category</option>
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                    <option value="custom" className="text-blue-400">
                                        + Add Custom Category
                                    </option>
                                </select>
                            )}
                        </div>

                        {/* Brand with Search */}
                        <div>
                            <label htmlFor="brand" className="block text-sm font-semibold text-white mb-2">
                                Brand *
                            </label>
                            {showCustomBrand ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        required
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter custom brand"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCustomBrand(false);
                                            setFormData({ ...formData, brand: '' });
                                        }}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        ← Back to brand list
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={brandSearch}
                                        onChange={(e) => {
                                            setBrandSearch(e.target.value);
                                            setShowBrandDropdown(true);
                                        }}
                                        onFocus={() => setShowBrandDropdown(true)}
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Search or select a brand"
                                    />
                                    {showBrandDropdown && (
                                        <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
                                            {filteredBrands.length > 0 ? (
                                                filteredBrands.map((brand) => (
                                                    <button
                                                        key={brand}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, brand });
                                                            setBrandSearch(brand);
                                                            setShowBrandDropdown(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 transition-colors"
                                                    >
                                                        {brand}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-slate-400">No brands found</div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCustomBrand(true);
                                                    setShowBrandDropdown(false);
                                                    setBrandSearch('');
                                                }}
                                                className="w-full text-left px-4 py-2 text-blue-400 hover:bg-slate-700 border-t border-slate-700"
                                            >
                                                + Add Custom Brand
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Size */}
                        <div>
                            <label htmlFor="size" className="block text-sm font-semibold text-white mb-2">
                                Size ({sizeUnit}) *
                            </label>
                            <input
                                type="number"
                                id="size"
                                required
                                min="1"
                                value={formData.size}
                                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={isLiquidCategory ? "e.g., 500" : "e.g., 100"}
                            />
                            <p className="mt-1 text-xs text-slate-500">Enter size in {sizeLabel} ({sizeUnit})</p>
                        </div>

                        {/* Auto-generated SKU Display */}
                        {generatedSKU && (
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <p className="text-xs font-medium text-slate-400 mb-1">Auto-generated SKU:</p>
                                <p className="text-sm font-mono font-bold text-green-400">{generatedSKU}</p>
                            </div>
                        )}

                        {/* Stock and Min Threshold */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="stock" className="block text-sm font-semibold text-white mb-2">
                                    Initial Stock *
                                </label>
                                <input
                                    type="number"
                                    id="stock"
                                    required
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label htmlFor="minThreshold" className="block text-sm font-semibold text-white mb-2">
                                    <span className="inline-flex items-center gap-2">
                                        Min Threshold *
                                        <span className="group relative">
                                            <svg className="w-4 h-4 text-slate-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                            </svg>
                                            <span className="invisible group-hover:visible absolute left-6 top-1/2 -translate-y-1/2 w-64 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-normal text-slate-300 shadow-xl z-10">
                                                When stock falls to or below this number, a Slack alert will be sent to notify the team about low stock.
                                            </span>
                                        </span>
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    id="minThreshold"
                                    required
                                    min="0"
                                    value={formData.minThreshold}
                                    onChange={(e) => setFormData({ ...formData, minThreshold: parseInt(e.target.value) })}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Quantity Per Unit */}
                        <div>
                            <label htmlFor="quantityPerUnit" className="block text-sm font-semibold text-white mb-2">
                                Quantity Per Unit *
                            </label>
                            <input
                                type="number"
                                id="quantityPerUnit"
                                required
                                min="1"
                                value={formData.quantityPerUnit}
                                onChange={(e) => setFormData({ ...formData, quantityPerUnit: parseInt(e.target.value) })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-slate-500">e.g., 24 for a case of 24 bottles</p>
                        </div>

                        {/* Cold Storage Checkbox */}
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="coldStorage"
                                    checked={formData.coldStorage}
                                    onChange={(e) => setFormData({ ...formData, coldStorage: e.target.checked })}
                                    className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                                />
                                <span className="text-sm font-semibold text-white">
                                    Cold Storage Item ❄️
                                </span>
                            </label>
                            <p className="mt-1 text-xs text-slate-500 ml-8">Check if this item requires refrigeration</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Link
                            href="/"
                            className="flex-1 rounded-lg bg-slate-800 px-6 py-3 text-center font-semibold text-white transition-all hover:bg-slate-700 border border-slate-700"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
