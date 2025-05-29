import { CodeParser } from "./parser";

describe("CodeParser", () => {
  describe("extractFunctions", () => {
    it("should extract regular function declarations", () => {
      const code = `
        function regularFunction(a, b) {
          return a + b;
        }
        
        export function exportedFunction() {
          return true;
        }
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions).toHaveLength(2);
      expect(functions[0].name).toBe("regularFunction");
      expect(functions[0].parameters).toEqual(["a", "b"]);
      expect(functions[1].name).toBe("exportedFunction");
      expect(functions[1].parameters).toEqual([]);
    });

    it("should extract arrow functions", () => {
      const code = `
        const arrowFunction = (x, y) => {
          return x * y;
        };
        
        const singleLineArrow = (n) => n * 2;
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions).toHaveLength(2);
      expect(functions[0].name).toBe("arrowFunction");
      expect(functions[0].parameters).toEqual(["x", "y"]);
      expect(functions[1].name).toBe("singleLineArrow");
      expect(functions[1].parameters).toEqual(["n"]);
    });

    it("should extract class methods", () => {
      const code = `
        class TestClass {
          constructor(name) {
            this.name = name;
          }
          
          public getName() {
            return this.name;
          }
          
          private setName(newName) {
            this.name = newName;
          }
          
          static createDefault() {
            return new TestClass("default");
          }
        }
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions.length).toBeGreaterThan(0);
      
      const constructorFunc = functions.find(f => f.name === "constructor");
      expect(constructorFunc).toBeDefined();
      expect(constructorFunc?.isMethod).toBe(true);
      expect(constructorFunc?.className).toBe("TestClass");
      
      const getNameFunc = functions.find(f => f.name === "getName");
      expect(getNameFunc).toBeDefined();
      expect(getNameFunc?.isMethod).toBe(true);
    });

    it("should handle async functions", () => {
      const code = `
        async function asyncFunction() {
          await somePromise();
          return true;
        }
        
        const asyncArrow = async (data) => {
          return await processData(data);
        };
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions).toHaveLength(2);
      expect(functions[0].name).toBe("asyncFunction");
      expect(functions[0].isAsync).toBe(true);
      expect(functions[1].name).toBe("asyncArrow");
      expect(functions[1].isAsync).toBe(true);
    });

    it("should handle generator functions", () => {
      const code = `
        function* generatorFunction() {
          yield 1;
          yield 2;
          return 3;
        }
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions).toHaveLength(1);
      expect(functions[0].name).toBe("generatorFunction");
      expect(functions[0].isGenerator).toBe(true);
    });

    it("should extract parameters with type annotations", () => {
      const code = `
        function typedFunction(name: string, age: number, active: boolean = true) {
          return { name, age, active };
        }
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions).toHaveLength(1);
      expect(functions[0].parameters).toEqual(["name", "age", "active"]);
    });

    it("should handle destructured parameters", () => {
      const code = `
        function destructuredParams({ name, age }, [first, second]) {
          return name + age + first + second;
        }
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions).toHaveLength(1);
      // Should extract some parameter names even from destructuring
      expect(functions[0].parameters.length).toBeGreaterThan(0);
    });

    it("should handle multi-line function signatures", () => {
      const code = `
        function multiLineSignature(
          firstParam: string,
          secondParam: number,
          thirdParam: boolean
        ) {
          return true;
        }
      `;
      
      const functions = CodeParser.extractFunctions(code, "test.ts");
      
      expect(functions).toHaveLength(1);
      expect(functions[0].parameters).toEqual(["firstParam", "secondParam", "thirdParam"]);
    });
  });
});

