const { analyzeErgonomics, generateMutations, getPoolSize } = require('../js/script.js');

describe('VaultMetrics Core Logic', () => {
    
    test('getPoolSize calculates character space correctly', () => {
        expect(getPoolSize('abc')).toBe(26); // Lowercase only
        expect(getPoolSize('abcA')).toBe(52); // Mixed case
        expect(getPoolSize('abcA1')).toBe(62); // Alphanumeric
        expect(getPoolSize('abcA1!')).toBe(94); // Full pool
    });

    test('generateMutations creates Hashcat POV variants', () => {
        const mutations = generateMutations('password');
        expect(mutations).toContain('p@$$w0rd'); // Leetspeak check
        expect(mutations).toContain('Password!'); // Capital + Symbol
        expect(mutations).toContain('password123'); // Appended numbers
    });

    test('analyzeErgonomics calculates hand alternation', () => {
        const fluid = analyzeErgonomics('ghityurw'); // Bouncing hands
        const heavy = analyzeErgonomics('qazwsxed'); // Left hand only
        
        expect(fluid.score).toBe('Fluid');
        expect(heavy.score).toBe('One-Hand Heavy');
    });
});