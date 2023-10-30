# Code Examples

Some examples of how to measure energy consumption of a program using the measure-energy-action tool. 

### Python
<table>
<tr>
<th>Json 1</th>
<th>Markdown</th>
</tr>
<tr>
<td>

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Set up Python
uses: actions/setup-python@v4
with:
  - run:  python -m pip install --upgrade pip
  - run: pip install -r requirements.txt
  - run: pip install pytest pytest-cov
  - run: pytest tests.py --doctest-modules --cov=com
```

</td>
<td>

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Set up Python
uses: actions/setup-python@v4
with:
    - run:  python -m pip install --upgrade pip
    - run: pip install -r requirements.txt
    - run: pip install pytest pytest-cov
    - uses: koenhagen/measure-energy-action@v0.7
      with:
        what-to-test: pytest tests.py --doctest-modules --cov=com
```

</td>
</tr>
</table>


### NodeJS
<table>
<tr>
<th>Json 1</th>
<th>Markdown</th>
</tr>
<tr>
<td>

```yaml
- uses: actions/checkout@v4
- name: Use Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '20.x'
- run: npm ci
- run: npm run build --if-present
- run: npm test
```

</td>
<td>

```yaml
- uses: actions/checkout@v4
- name: Use Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '20.x'
- run: npm ci
- run: npm run build --if-present
- uses: koenhagen/measure-energy-action@v0.7
  with:
    what-to-test: npm test
```

</td>
</tr>
</table>