(global as any).Deno = {
  env: {
    get: jest.fn(),
  },
};

afterEach(() => {
  jest.clearAllMocks();
});
