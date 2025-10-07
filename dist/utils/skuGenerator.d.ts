export interface SKUGenerationOptions {
    categoryId: string;
    categoryName: string;
    productName?: string;
    customPrefix?: string;
}
export declare class SKUGenerator {
    static generateSKU(options: SKUGenerationOptions): Promise<string>;
    private static createPrefixFromCategory;
    private static getNextSKUNumber;
    static isSKUUnique(sku: string, excludeId?: string): Promise<boolean>;
    static generateMultipleSKUs(options: SKUGenerationOptions, count: number): Promise<string[]>;
    static suggestSKU(options: SKUGenerationOptions): Promise<string>;
    static getSKUStats(categoryId: string): Promise<{
        totalProducts: number;
        lastSKU: string | null;
        nextSKU: string;
    }>;
}
export default SKUGenerator;
//# sourceMappingURL=skuGenerator.d.ts.map