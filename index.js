(function () {
  class Host {
    constructor (i) {
      this.name = `host${i}`;
      this.windowSize = 1;
    }
  
    avoidCongestion (isImpendedCongestion) {
      if (isImpendedCongestion && this.windowSize) {
        this.windowSize *= 0.5;
      }
      else {
        this.windowSize++;
      }
    }

    startAvoidCongestion (network) {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        network.calcCongestion();

        const isImpended = network.congestion > network.MAX_CONGESTION;
        this.avoidCongestion(isImpended);

        if (count > 300) {
          clearInterval(interval);
          network.removeHost(this.name);
        }
      }, Math.floor(Math.random() * (200 - 100)) + 100);
    }
  }
  
  class Network {
    constructor (name) {
      this.MAX_HOSTS = 10;
      this.MAX_CONGESTION = 50;

      this.name = name;
      this.hosts = [];
      this.wsResults = Array(this.MAX_HOSTS).fill().map(() => []);
      this.congestion = 0;
      this.congestionResults = [];
      this.endEvent = new Event(name);
      this.calcCount = 0;
    }
  
    addHost (host) {
      this.hosts.push(host);
      host.startAvoidCongestion(this);
      console.log('add');
    }

    addHosts () {
      const hostInterval = setInterval(() => {
        if (this.hosts.length > 9) {
          clearInterval(hostInterval);
        }
        const host = new Host(this.hosts.length);
        this.addHost(host);
      }, 300);
    }

    removeHost (hostName) {
      const index = this.hosts.findIndex(host => {
        return host ? host.name === hostName : false;
      });
      this.hosts[index] = undefined;
      console.log('remove', this.hosts);
    }
  
    calcCongestion () {
      this.congestion = this.hosts.reduce((prev, current) => {
        return current ? prev + current.windowSize : prev;
      }, 0);
      this.congestionResults.push(this.congestion);
    }
  
    start () {
      const interval = setInterval(() => {
        const isOutOfHosts = this.hosts.every(host => host === undefined);
        if (this.hosts.length > 0 && isOutOfHosts) {
          clearInterval(interval);
          window.dispatchEvent(this.endEvent);
        }
        else {
          this.calcCount++;
          for (let i = 0; i < this.MAX_HOSTS; i++) {
            const host = this.hosts[i];
            if (host) {
              this.wsResults[i].push(host.windowSize);
            }
            else {
              this.wsResults[i].push(0);
            }
          }
        }
      }, 400);
    }
  }
  
  function renderChart (network) {
    const chartDefaultOption = {
      interaction: { enabled: false },
      point: { show: false },
    };
    
    const hostWindowSizes = network.wsResults.map((ws, index) => {
      ws.unshift(`host${index}`);
      return ws;
    });

    const hostWSChart = c3.generate({
      data: { columns: hostWindowSizes },
      axis: {
        y: {
          label: { text: 'Window Size' },
        },
        x: {
          label: { text: 'Time' },
        },
      },
      ...chartDefaultOption,
    });
    const stackedWSChart = c3.generate({
      data: {
        columns: hostWindowSizes,
        types: hostWindowSizes.reduce((prev, current) => {
          prev[current[0]] = 'area';
          return prev;
        }, {}),
        groups: [hostWindowSizes.map(ws => ws[0])],
      },
      axis: {
        y: {
          label: { text: 'Window Size' },
        },
        x: {
          label: { text: 'Time' },
        },
      },
      ...chartDefaultOption,
    });
    const congestionChart = c3.generate({
      data: { columns: [['congestion', ...network.congestionResults]] },
      axis: {
        y: {
          label: { text: 'Congestion' },
        },
        x: {
          label: { text: 'Time' },
        },
      },
      ...chartDefaultOption,
    });

    document.getElementById('window-size').append(hostWSChart.element);
    document.getElementById('stacked-window-size').append(stackedWSChart.element);
    document.getElementById('congestion').append(congestionChart.element);
  }
  
  function activeNetwork (networkName) {
    const network = new Network(networkName);
    network.start();
    network.addHosts();
    window.addEventListener(network.name, () => {
      renderChart(network);
    });
  }
  
  activeNetwork('aimd');
})();
  