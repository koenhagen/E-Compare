# $\color{lightgreen}{\large\textbf{E-Co}}$‎​mpare

$\color{green}{\large\textbf{E-Co}}$‎​mpare serves as a GitHub workflow tool designed to offer valuable insights into the energy consumption of software, particularly through the comparison of different versions within pull requests. Operating as a black-box system, it utilizes the user's unit tests to provide insights into the energy efficiency impact of code changes, aiding developers in making informed decisions.

## Implementation

The $\color{green}{\large\textbf{E-Co}}$‎​mpare tool only requires a few line changes compared to standard unit testing workflows. The tool has been purposely built to minimize the amount of changes required to get it implemented. To generate enough energy reports to make the comparison functionality work it's best to have the tool trigger on "push". 

### Basic implementation
```
name: run-e-compare

on:
  push:
    paths-ignore:
      - README.md
      - CHANGELOG.md
      - .gitignore
      - .github/**
      - .energy/**
jobs:
  measure-energy:
    runs-on: ubuntu-latest
    permissions: write-all
    name: A job to measure energy
    steps:
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4

      - name: run-energy-measuring
        id: energy
        uses: koenhagen/measure-energy-action@v0.16
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          run: sleep 10 #Any command of your choice which you want to have tested
```

### Examples

Some examples of how to estimate energy consumption of a program using the measure-energy-action tool. 

#### Python

```diff
steps:
  - uses: actions/checkout@v4
  - name: Set up Python
  - uses: actions/setup-python@v4
    with:
      python-version: '3.x'
  - run:  python -m pip install --upgrade pip
  - run: pip install -r requirements.txt
  - run: pip install pytest pytest-cov
+    - uses: koenhagen/measure-energy-action@v0.16
+      with:
+        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pytest tests.py --doctest-modules --cov=com
```

#### NodeJS
```diff
steps:
  - uses: actions/checkout@v4
  - name: Use Node.js
    uses: actions/setup-node@v3
    with:
      node-version: '20.x'
  - run: npm ci
  - run: npm run build --if-present
+  - uses: koenhagen/measure-energy-action@v0.16
+    with:
+      GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      run: npm test
```

## Functionality
$\color{green}{\large\textbf{E-Co}}$‎​mpare makes use of the [XGBoost Machine Learning model](https://github.com/green-coding-berlin/spec-power-model) by green-coding-berlin for energy estimation in the cloud. 
