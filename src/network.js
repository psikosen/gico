// Network Visualization for Conversation Map
import * as d3 from 'd3';

class NetworkViz {
    constructor(svgElement, containerElement) {
        this.svg = d3.select(svgElement);
        this.container = d3.select(containerElement);
        this.nodes = [];
        this.links = [];
        this.simulation = null;
        this.transform = { x: 0, y: 0, k: 1 };
        
        // Initialize zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                this.transform = event.transform;
                this.container.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        // Event callbacks
        this.onNodeClick = null;
    }
    
    // Set data for the network
    setData(nodes, links) {
        this.nodes = nodes;
        this.links = links;
    }
    
    // Set node click callback
    setNodeClickCallback(callback) {
        this.onNodeClick = callback;
    }
    
    // Initialize or update the visualization
    render() {
        // Clear the container
        this.container.selectAll('*').remove();
        
        if (this.nodes.length === 0) {
            this.showEmptyMessage();
            return;
        }
        
        // Create the simulation
        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.svg.node().clientWidth / 2, this.svg.node().clientHeight / 2))
            .force('collision', d3.forceCollide().radius(50))
            .on('tick', () => this.ticked());
        
        // Create links
        this.linkElements = this.container.selectAll('.map-link')
            .data(this.links)
            .enter()
            .append('line')
            .attr('class', 'map-link')
            .attr('stroke-width', 2);
        
        // Create nodes
        this.nodeElements = this.container.selectAll('.map-node')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', d => `map-node ${d.type}`)
            .attr('data-id', d => d.id)
            .attr('data-type', d => d.type)
            .on('click', (event, d) => {
                if (this.onNodeClick) {
                    this.onNodeClick(d);
                }
            });
        
        // Add circles to nodes
        this.nodeElements.append('circle')
            .attr('r', 40)
            .attr('fill', d => d.type === 'tag' ? 'rgba(80, 227, 194, 0.7)' : 'rgba(74, 144, 226, 0.7)')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);
        
        // Add text to nodes
        this.nodeElements.append('text')
            .attr('dy', 0)
            .text(d => {
                return d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title;
            });
        
        // Add bookmark indicators
        this.nodeElements.filter(d => d.bookmarked)
            .append('text')
            .attr('class', 'bookmark-indicator')
            .attr('x', 25)
            .attr('y', -30)
            .attr('font-size', '14px')
            .attr('fill', '#FFD700')
            .attr('text-anchor', 'middle')
            .text('★');
        
        // Add drag behavior
        this.nodeElements.call(d3.drag()
            .on('start', (event, d) => this.dragstarted(event, d))
            .on('drag', (event, d) => this.dragged(event, d))
            .on('end', (event, d) => this.dragended(event, d)));
        
        return this;
    }
    
    // Add tag indicators to nodes
    addTagsToNodes(tagsData) {
        this.nodeElements.each(function(d) {
            const node = d3.select(this);
            const nodeTags = tagsData.filter(tag => tag.conversation_id === d.id);
            
            if (nodeTags.length > 0) {
                // Add tag names below node
                const tagNames = node.append('g')
                    .attr('class', 'tag-names')
                    .attr('transform', 'translate(0, 55)');
                
                // Show up to 3 tags, with ellipsis if more
                const displayTags = nodeTags.slice(0, 3);
                displayTags.forEach((tag, i) => {
                    tagNames.append('text')
                        .attr('y', i * 15)
                        .attr('text-anchor', 'middle')
                        .text(`#${tag.name}`);
                });
                
                if (nodeTags.length > 3) {
                    tagNames.append('text')
                        .attr('y', 3 * 15)
                        .attr('text-anchor', 'middle')
                        .text('...');
                }
                
                // Add tag indicator
                node.append('circle')
                    .attr('class', 'tag-indicator')
                    .attr('r', 8)
                    .attr('cx', 25)
                    .attr('cy', -25)
                    .attr('fill', 'rgba(80, 227, 194, 0.9)')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1);
                
                // Add tag count
                node.append('text')
                    .attr('class', 'tag-count')
                    .attr('x', 25)
                    .attr('y', -25)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .attr('font-size', '10px')
                    .attr('fill', 'white')
                    .text(nodeTags.length);
            }
        });
        
        return this;
    }
    
    // Tick function for simulation
    ticked() {
        this.linkElements
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        this.nodeElements
            .attr('transform', d => `translate(${d.x}, ${d.y})`);
    }
    
    // Drag functions
    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Highlight a node
    highlightNode(nodeId) {
        // Remove previous highlight
        this.nodeElements.classed('selected', false);
        this.linkElements.classed('highlighted', false);
        
        // Highlight the selected node
        const selectedNode = this.nodeElements.filter(d => d.id === nodeId);
        selectedNode.classed('selected', true);
        
        // Highlight connected links
        const connectedLinks = this.links.filter(
            link => link.source.id === nodeId || link.target.id === nodeId
        );
        
        connectedLinks.forEach(link => {
            this.linkElements
                .filter(d => 
                    (d.source.id === link.source.id && d.target.id === link.target.id) ||
                    (d.source.id === link.target.id && d.target.id === link.source.id)
                )
                .classed('highlighted', true);
        });
        
        return this;
    }
    
    // Zoom to a specific node
    zoomToNode(nodeId) {
        const nodeData = this.nodes.find(n => n.id === nodeId);
        
        if (nodeData && nodeData.x && nodeData.y) {
            const width = this.svg.node().clientWidth;
            const height = this.svg.node().clientHeight;
            
            const scale = 1.5; // Zoom level
            const x = width / 2 - nodeData.x * scale;
            const y = height / 2 - nodeData.y * scale;
            
            this.svg.transition().duration(750)
                .call(this.zoom.transform, 
                    d3.zoomIdentity.translate(x, y).scale(scale));
            
            this.transform = { x, y, k: scale };
        }
        
        return this;
    }
    
    // Filter by tag
    filterByTag(tagName, allTags) {
        const taggedNodeIds = new Set();
        
        // Find all nodes with the given tag
        allTags.forEach(tag => {
            if (tag.name === tagName) {
                taggedNodeIds.add(tag.conversation_id);
            }
        });
        
        // Filter nodes
        this.nodeElements.style('opacity', d => 
            taggedNodeIds.has(d.id) ? 1 : 0.2
        );
        
        // Filter links
        this.linkElements.style('opacity', d => 
            (taggedNodeIds.has(d.source.id) && taggedNodeIds.has(d.target.id)) ? 1 : 0.1
        );
        
        return this;
    }
    
    // Reset filter
    resetFilter() {
        this.nodeElements.style('opacity', 1);
        this.linkElements.style('opacity', 1);
        return this;
    }
    
    // Manual zoom controls
    zoomIn() {
        const newScale = this.transform.k * 1.2;
        if (newScale <= 3) {
            this.svg.transition().duration(300)
                .call(this.zoom.transform, 
                    d3.zoomIdentity.translate(this.transform.x, this.transform.y).scale(newScale));
            this.transform.k = newScale;
        }
        return this;
    }
    
    zoomOut() {
        const newScale = this.transform.k * 0.8;
        if (newScale >= 0.1) {
            this.svg.transition().duration(300)
                .call(this.zoom.transform, 
                    d3.zoomIdentity.translate(this.transform.x, this.transform.y).scale(newScale));
            this.transform.k = newScale;
        }
        return this;
    }
    
    resetZoom() {
        this.svg.transition().duration(500)
            .call(this.zoom.transform, d3.zoomIdentity);
        this.transform = { x: 0, y: 0, k: 1 };
        return this;
    }
    
    // Show empty message when no nodes
    showEmptyMessage() {
        this.container.append('text')
            .attr('x', this.svg.node().clientWidth / 2)
            .attr('y', this.svg.node().clientHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '18px')
            .text('No conversations yet. Click the + button to create one!');
    }
}

export default NetworkViz;
