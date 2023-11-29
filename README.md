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
        run: pytest tests.py --doctest-modules --cov=com
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
    run: npm test
```

</td>
</tr>
</table>


killall -9 -q ./demo-reporter-exe || true
./demo-reporter-exe | tee -a ./cpu-util-total.txt > ./cpu-util.txt &

cat ./cpu-util.txt | python3.10 xgb.py --tdp 240 --cpu-threads 128 --cpu-cores 64 --cpu-make 'amd' --release-year 2021 --ram 512 --cpu-freq 2250 --cpu-chips 1 | tee -a ./energy-total.txt > ./energy.txt
