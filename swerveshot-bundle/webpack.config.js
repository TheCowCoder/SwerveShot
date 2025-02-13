import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    mode: 'development', // Set to 'development' for easier debugging
    devtool: 'eval-source-map',
    entry: './src/client.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public'), // Output to 'public' folder
        clean: true, // Cleans old files in output directory
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    devServer: {
        static: path.resolve(__dirname, 'public'),
        compress: true,
        port: 3000,
        hot: true, // Enables Hot Module Replacement
        open: true, // Opens browser automatically,
        proxy: [
            {
                context: ['/socket.io'], // Context for WebSocket requests
                target: 'http://localhost:3000', // Backend server running Socket.IO
                ws: true, // Enable WebSocket proxying
                changeOrigin: true,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'public', 'index.html'), // Use absolute path
            inject: 'body', // Ensures the script is injected before closing </body>
        }),
    ],
    resolve: {
        extensions: ['.js', '.json'], // Allows importing without specifying extensions
    },
};
